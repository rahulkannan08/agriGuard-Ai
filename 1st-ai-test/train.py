from __future__ import annotations

import argparse
import csv
import json
import os
import random
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'

import kagglehub
import matplotlib.pyplot as plt
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from sklearn.metrics import classification_report, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler

from config import ALLOWED_IMAGE_EXTENSIONS, SUPPORTED_CROPS, parse_crop_and_disease
from model_utils import build_model, get_eval_transform, get_train_transform
from nvidia_client import validate_dataset_with_ai


@dataclass
class Record:
    path: str
    class_name: str
    crop: str
    disease: str
    label: int


class LeafDataset(Dataset):
    def __init__(self, records: Sequence[Record], transform=None) -> None:
        self.records = list(records)
        self.transform = transform

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, idx: int):
        rec = self.records[idx]
        image = Image.open(rec.path).convert("RGB")
        if self.transform is not None:
            image = self.transform(image)
        return image, rec.label


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train AgriVisionAI disease classifier")
    parser.add_argument("--arch", type=str, default="efficientnet_b0", choices=["efficientnet_b0", "resnet50"])
    parser.add_argument("--epochs", type=int, default=25)
    parser.add_argument("--freeze-epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--num-workers", type=int, default=0)
    parser.add_argument("--finetune-batch-size", type=int, default=16)
    parser.add_argument("--lr-head", type=float, default=1e-3)
    parser.add_argument("--lr-finetune", type=float, default=1e-4)
    parser.add_argument("--weight-decay", type=float, default=1e-4)
    parser.add_argument("--patience", type=int, default=5)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output-dir", type=str, default="artifacts")
    parser.add_argument("--reports-dir", type=str, default="reports")
    parser.add_argument("--dataset-path", type=str, default=r"C:\Users\rahul\OneDrive\Pictures\aiii\training\archive (1)\New Plant Diseases Dataset(Augmented)\New Plant Diseases Dataset(Augmented)\train")
    parser.add_argument("--max-samples", type=int, default=0)
    parser.add_argument("--checkpoint-name", type=str, default="best_model.current_run.pth")
    parser.add_argument("--allow-overwrite-best-model", action="store_true")
    return parser.parse_args()


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


def discover_records(dataset_root: Path) -> Tuple[List[Record], List[str]]:
    discovered: List[Dict[str, str]] = []

    for file_path in dataset_root.rglob("*"):
        if not file_path.is_file() or file_path.suffix.lower() not in ALLOWED_IMAGE_EXTENSIONS:
            continue

        class_name = file_path.parent.name
        crop, disease = parse_crop_and_disease(class_name)
        if crop not in SUPPORTED_CROPS:
            continue

        discovered.append(
            {
                "path": str(file_path),
                "class_name": class_name,
                "crop": crop,
                "disease": disease,
            }
        )

    if not discovered:
        print("❌ Dataset not found. Attempting AI-powered fallback...")
        supported_crops = ", ".join(sorted(SUPPORTED_CROPS))
        ai_response = validate_dataset_with_ai({
            "path": str(dataset_root),
            "error": f"No images found. Supported crops: {supported_crops}"
        })
        print(f"AI Recommendation: {ai_response}")
        raise ValueError(f"Dataset validation failed. AI Response: {json.dumps(ai_response)}")

    class_names = sorted({row["class_name"] for row in discovered})
    class_to_idx = {name: idx for idx, name in enumerate(class_names)}

    records: List[Record] = []
    for row in discovered:
        records.append(
            Record(
                path=row["path"],
                class_name=row["class_name"],
                crop=row["crop"],
                disease=row["disease"],
                label=class_to_idx[row["class_name"]],
            )
        )

    return records, class_names


def stratified_subsample(records: List[Record], max_samples: int, seed: int) -> List[Record]:
    if max_samples <= 0 or len(records) <= max_samples:
        return records

    rng = random.Random(seed)
    per_label: Dict[int, List[Record]] = defaultdict(list)
    for rec in records:
        per_label[rec.label].append(rec)

    labels = sorted(per_label.keys())
    for label in labels:
        rng.shuffle(per_label[label])

    base_take = max(1, max_samples // max(1, len(labels)))
    selected: List[Record] = []
    leftovers: List[Record] = []

    for label in labels:
        bucket = per_label[label]
        take = min(base_take, len(bucket))
        selected.extend(bucket[:take])
        leftovers.extend(bucket[take:])

    if len(selected) > max_samples:
        rng.shuffle(selected)
        selected = selected[:max_samples]
    elif len(selected) < max_samples and leftovers:
        rng.shuffle(leftovers)
        selected.extend(leftovers[: (max_samples - len(selected))])

    rng.shuffle(selected)
    return selected


def split_records(records: List[Record], seed: int) -> Tuple[List[Record], List[Record], List[Record]]:
    indices = list(range(len(records)))
    labels = [records[i].label for i in indices]

    try:
        train_idx, temp_idx = train_test_split(
            indices,
            test_size=0.30,
            random_state=seed,
            stratify=labels,
        )

        temp_labels = [records[i].label for i in temp_idx]
        val_idx, test_idx = train_test_split(
            temp_idx,
            test_size=0.50,
            random_state=seed,
            stratify=temp_labels,
        )
    except ValueError:
        rng = random.Random(seed)
        rng.shuffle(indices)
        n_total = len(indices)
        n_train = int(0.70 * n_total)
        n_val = int(0.15 * n_total)

        train_idx = indices[:n_train]
        val_idx = indices[n_train : n_train + n_val]
        test_idx = indices[n_train + n_val :]

    train_records = [records[i] for i in train_idx]
    val_records = [records[i] for i in val_idx]
    test_records = [records[i] for i in test_idx]
    return train_records, val_records, test_records


def save_splits_csv(
    train_records: List[Record],
    val_records: List[Record],
    test_records: List[Record],
    out_path: Path,
) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["path", "class_name", "crop", "disease", "label", "split"])
        for rec in train_records:
            writer.writerow([rec.path, rec.class_name, rec.crop, rec.disease, rec.label, "train"])
        for rec in val_records:
            writer.writerow([rec.path, rec.class_name, rec.crop, rec.disease, rec.label, "val"])
        for rec in test_records:
            writer.writerow([rec.path, rec.class_name, rec.crop, rec.disease, rec.label, "test"])


def compute_class_weights(records: List[Record], num_classes: int, device: torch.device) -> torch.Tensor:
    counts = [0 for _ in range(num_classes)]
    for rec in records:
        counts[rec.label] += 1

    counts = [count if count > 0 else 1 for count in counts]
    raw = np.array([1.0 / count for count in counts], dtype=np.float32)
    raw = raw / raw.sum() * num_classes
    return torch.tensor(raw, dtype=torch.float32, device=device)


def build_weighted_sampler(records: List[Record], num_classes: int) -> WeightedRandomSampler:
    counts = [0 for _ in range(num_classes)]
    for rec in records:
        counts[rec.label] += 1

    counts = [count if count > 0 else 1 for count in counts]
    weights = [1.0 / counts[rec.label] for rec in records]
    return WeightedRandomSampler(
        weights=torch.tensor(weights, dtype=torch.double),
        num_samples=len(weights),
        replacement=True,
    )


def set_backbone_frozen(model: nn.Module, arch: str, freeze: bool) -> None:
    for param in model.parameters():
        param.requires_grad = not freeze

    if arch == "efficientnet_b0":
        for param in model.classifier.parameters():
            param.requires_grad = True
    elif arch == "resnet50":
        for param in model.fc.parameters():
            param.requires_grad = True


def run_epoch(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer | None,
    device: torch.device,
    scaler: torch.cuda.amp.GradScaler | None = None,
) -> Tuple[float, List[int], List[int]]:
    train_mode = optimizer is not None
    model.train(train_mode)

    total_loss = 0.0
    y_true: List[int] = []
    y_pred: List[int] = []

    for images, labels in loader:
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)

        if train_mode:
            optimizer.zero_grad(set_to_none=True)

        with torch.set_grad_enabled(train_mode):
            if train_mode and scaler is not None:
                with torch.autocast(device_type='cuda', dtype=torch.float16):
                    logits = model(images)
                    loss = criterion(logits, labels)
                scaler.scale(loss).backward()
                scaler.step(optimizer)
                scaler.update()
            else:
                logits = model(images)
                loss = criterion(logits, labels)
                if train_mode:
                    loss.backward()
                    optimizer.step()

        total_loss += loss.item() * labels.size(0)
        preds = torch.argmax(logits, dim=1)
        y_true.extend(labels.detach().cpu().tolist())
        y_pred.extend(preds.detach().cpu().tolist())

    return total_loss / max(1, len(loader.dataset)), y_true, y_pred


def compute_metrics(y_true: List[int], y_pred: List[int]) -> Dict[str, float]:
    return {
        "precision_macro": float(precision_score(y_true, y_pred, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y_true, y_pred, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
    }


def save_confusion_matrix(y_true: List[int], y_pred: List[int], class_names: List[str], out_path: Path) -> None:
    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(class_names))))
    plt.figure(figsize=(12, 10))
    plt.imshow(cm, interpolation="nearest", cmap="Blues")
    plt.title("Confusion Matrix")
    plt.colorbar()
    plt.xlabel("Predicted")
    plt.ylabel("True")
    plt.tight_layout()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(out_path, dpi=180)
    plt.close()


def save_classification_report_csv(report: Dict[str, Dict[str, float]], out_path: Path) -> None:
    keys = ["precision", "recall", "f1-score", "support"]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["label", *keys])
        for label, values in report.items():
            if isinstance(values, dict):
                writer.writerow([label, values.get("precision", 0), values.get("recall", 0), values.get("f1-score", 0), values.get("support", 0)])


def save_training_history(history: List[Dict[str, float]], out_path: Path) -> None:
    if not history:
        return

    columns = list(history[0].keys())
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        writer.writerows(history)


def main() -> None:
    args = parse_args()
    set_seed(args.seed)

    output_dir = Path(args.output_dir)
    reports_dir = Path(args.reports_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    reports_dir.mkdir(parents=True, exist_ok=True)

    stable_best_model_path = output_dir / "best_model.pth"
    if args.allow_overwrite_best_model:
        current_run_best_model_path = stable_best_model_path
    else:
        current_run_best_model_path = output_dir / args.checkpoint_name
        if stable_best_model_path.exists():
            print(f"Preserving existing stable model: {stable_best_model_path}")
            print(f"Current training run will save to: {current_run_best_model_path}")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    if args.dataset_path:
        dataset_root = Path(args.dataset_path)
    else:
        path = kagglehub.dataset_download("abdallahalidev/plantvillage-dataset")
        print("Path to dataset files:", path)
        dataset_root = Path(path)

    records, class_names = discover_records(dataset_root)
    records = stratified_subsample(records, args.max_samples, args.seed)

    train_records, val_records, test_records = split_records(records, args.seed)
    save_splits_csv(train_records, val_records, test_records, output_dir / "splits.csv")

    num_classes = len(class_names)

    train_dataset = LeafDataset(train_records, transform=get_train_transform())
    val_dataset = LeafDataset(val_records, transform=get_eval_transform())
    test_dataset = LeafDataset(test_records, transform=get_eval_transform())

    class_weights = compute_class_weights(train_records, num_classes, device)
    sampler = build_weighted_sampler(train_records, num_classes)

    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        sampler=sampler,
        num_workers=args.num_workers,
        pin_memory=torch.cuda.is_available(),
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        pin_memory=torch.cuda.is_available(),
    )
    test_loader = DataLoader(
        test_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        pin_memory=torch.cuda.is_available(),
    )

    model = build_model(args.arch, num_classes=num_classes, pretrained=True).to(device)
    criterion = nn.CrossEntropyLoss(weight=class_weights)

    set_backbone_frozen(model, args.arch, freeze=True)
    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=args.lr_head,
        weight_decay=args.weight_decay,
    )

    best_f1 = -1.0
    best_epoch = -1
    wait = 0
    history: List[Dict[str, float]] = []
    
    scaler = torch.cuda.amp.GradScaler() if device.type == 'cuda' else None
    print(f"Mixed Precision Training: {'Enabled' if scaler else 'Disabled'}")

    for epoch in range(1, args.epochs + 1):
        if epoch == args.freeze_epochs + 1:
            torch.cuda.empty_cache()
            set_backbone_frozen(model, args.arch, freeze=False)
            optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr_finetune, weight_decay=args.weight_decay)
            
            val_loader = DataLoader(
                val_dataset,
                batch_size=args.finetune_batch_size,
                shuffle=False,
                num_workers=args.num_workers,
                pin_memory=torch.cuda.is_available(),
            )
            train_loader = DataLoader(
                train_dataset,
                batch_size=args.finetune_batch_size,
                sampler=sampler,
                num_workers=args.num_workers,
                pin_memory=torch.cuda.is_available(),
            )

        train_loss, train_true, train_pred = run_epoch(model, train_loader, criterion, optimizer, device, scaler)
        val_loss, val_true, val_pred = run_epoch(model, val_loader, criterion, None, device, scaler)

        train_metrics = compute_metrics(train_true, train_pred)
        val_metrics = compute_metrics(val_true, val_pred)

        row = {
            "epoch": float(epoch),
            "train_loss": train_loss,
            "val_loss": val_loss,
            "train_f1_macro": train_metrics["f1_macro"],
            "val_f1_macro": val_metrics["f1_macro"],
            "val_precision_macro": val_metrics["precision_macro"],
            "val_recall_macro": val_metrics["recall_macro"],
        }
        history.append(row)

        print(
            f"Epoch {epoch:02d} | "
            f"train_loss={train_loss:.4f} "
            f"val_loss={val_loss:.4f} "
            f"val_f1={val_metrics['f1_macro']:.4f}"
        )

        if val_metrics["f1_macro"] > best_f1:
            best_f1 = val_metrics["f1_macro"]
            best_epoch = epoch
            wait = 0
            torch.save(model.state_dict(), current_run_best_model_path)
        else:
            wait += 1

        if wait >= args.patience:
            print("Early stopping triggered.")
            break
    
    torch.cuda.empty_cache()
    save_training_history(history, reports_dir / "training_history.csv")

    model.load_state_dict(torch.load(current_run_best_model_path, map_location=device))
    test_loss, test_true, test_pred = run_epoch(model, test_loader, criterion, None, device, scaler)
    test_metrics = compute_metrics(test_true, test_pred)

    report = classification_report(
        test_true,
        test_pred,
        labels=list(range(num_classes)),
        target_names=class_names,
        output_dict=True,
        zero_division=0,
    )
    save_classification_report_csv(report, reports_dir / "classification_report.csv")
    save_confusion_matrix(test_true, test_pred, class_names, reports_dir / "confusion_matrix.png")

    summary = {
        "arch": args.arch,
        "best_epoch": best_epoch,
        "best_val_f1_macro": best_f1,
        "test_loss": test_loss,
        "test_precision_macro": test_metrics["precision_macro"],
        "test_recall_macro": test_metrics["recall_macro"],
        "test_f1_macro": test_metrics["f1_macro"],
        "num_classes": num_classes,
        "num_train": len(train_records),
        "num_val": len(val_records),
        "num_test": len(test_records),
        "best_model_path": str(current_run_best_model_path),
        "stable_model_path": str(stable_best_model_path),
        "stable_model_overwritten": bool(args.allow_overwrite_best_model),
    }

    (output_dir / "model_meta.json").write_text(
        json.dumps(
            {
                "arch": args.arch,
                "class_names": class_names,
                "image_size": 224,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    (reports_dir / "metrics_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print("Training complete.")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
