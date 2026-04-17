from __future__ import annotations

import argparse
import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

import matplotlib.pyplot as plt
import torch
import torch.nn as nn
from PIL import Image
from sklearn.metrics import classification_report, confusion_matrix, f1_score, precision_score, recall_score
from torch.utils.data import DataLoader, Dataset

from model_utils import build_model, get_eval_transform


@dataclass
class Record:
    path: str
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
    parser = argparse.ArgumentParser(description="Evaluate trained AgriVisionAI model")
    parser.add_argument("--artifacts-dir", type=str, default="artifacts")
    parser.add_argument("--reports-dir", type=str, default="reports")
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--num-workers", type=int, default=0)
    return parser.parse_args()


def load_test_records(splits_csv: Path) -> List[Record]:
    records: List[Record] = []
    with splits_csv.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("split") != "test":
                continue
            records.append(Record(path=row["path"], label=int(row["label"])))
    return records


def run_eval(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
) -> Tuple[float, List[int], List[int]]:
    model.eval()
    total_loss = 0.0
    y_true: List[int] = []
    y_pred: List[int] = []

    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device)
            labels = labels.to(device)

            logits = model(images)
            loss = criterion(logits, labels)

            total_loss += loss.item() * labels.size(0)
            preds = torch.argmax(logits, dim=1)
            y_true.extend(labels.cpu().tolist())
            y_pred.extend(preds.cpu().tolist())

    return total_loss / max(len(loader.dataset), 1), y_true, y_pred


def save_confusion_matrix(y_true: List[int], y_pred: List[int], class_names: List[str], out: Path) -> None:
    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(class_names))))
    plt.figure(figsize=(12, 10))
    plt.imshow(cm, interpolation="nearest", cmap="Blues")
    plt.title("Confusion Matrix (Evaluation)")
    plt.colorbar()
    plt.xlabel("Predicted")
    plt.ylabel("True")
    plt.tight_layout()
    out.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(out, dpi=180)
    plt.close()


def save_report_csv(report: Dict[str, Dict[str, float]], out_path: Path) -> None:
    keys = ["precision", "recall", "f1-score", "support"]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["label", *keys])
        for label, values in report.items():
            if isinstance(values, dict):
                writer.writerow([label, values.get("precision", 0), values.get("recall", 0), values.get("f1-score", 0), values.get("support", 0)])


def main() -> None:
    args = parse_args()

    artifacts_dir = Path(args.artifacts_dir)
    reports_dir = Path(args.reports_dir)
    reports_dir.mkdir(parents=True, exist_ok=True)

    meta = json.loads((artifacts_dir / "model_meta.json").read_text(encoding="utf-8"))
    class_names = meta["class_names"]
    arch = meta["arch"]

    test_records = load_test_records(artifacts_dir / "splits.csv")
    if not test_records:
        raise ValueError("No test records found in artifacts/splits.csv")

    test_dataset = LeafDataset(test_records, transform=get_eval_transform())
    test_loader = DataLoader(
        test_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        pin_memory=torch.cuda.is_available(),
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = build_model(arch=arch, num_classes=len(class_names), pretrained=False).to(device)
    model.load_state_dict(torch.load(artifacts_dir / "best_model.pth", map_location=device))

    criterion = nn.CrossEntropyLoss()
    test_loss, y_true, y_pred = run_eval(model, test_loader, criterion, device)

    precision = precision_score(y_true, y_pred, average="macro", zero_division=0)
    recall = recall_score(y_true, y_pred, average="macro", zero_division=0)
    f1 = f1_score(y_true, y_pred, average="macro", zero_division=0)

    report = classification_report(
        y_true,
        y_pred,
        labels=list(range(len(class_names))),
        target_names=class_names,
        output_dict=True,
        zero_division=0,
    )
    save_report_csv(report, reports_dir / "classification_report_eval.csv")
    save_confusion_matrix(y_true, y_pred, class_names, reports_dir / "confusion_matrix_eval.png")

    summary = {
        "test_loss": test_loss,
        "precision_macro": float(precision),
        "recall_macro": float(recall),
        "f1_macro": float(f1),
        "samples": len(test_records),
    }
    (reports_dir / "metrics_summary_eval.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
