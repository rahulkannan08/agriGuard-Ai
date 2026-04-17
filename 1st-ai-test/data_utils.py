from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import torch
from PIL import Image
from sklearn.model_selection import train_test_split
from torch.utils.data import Dataset, WeightedRandomSampler

from config import ALLOWED_IMAGE_EXTENSIONS, SUPPORTED_CROPS, parse_crop_and_disease


@dataclass
class SplitData:
    train: pd.DataFrame
    val: pd.DataFrame
    test: pd.DataFrame


class PlantVillageDataset(Dataset):
    def __init__(self, records: pd.DataFrame, transform=None) -> None:
        self.records = records.reset_index(drop=True)
        self.transform = transform

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, idx: int):
        row = self.records.iloc[idx]
        image = Image.open(row["path"]).convert("RGB")
        if self.transform is not None:
            image = self.transform(image)
        return image, int(row["label"])


def find_image_files(dataset_root: Path) -> List[Path]:
    files: List[Path] = []
    for file_path in dataset_root.rglob("*"):
        if not file_path.is_file():
            continue
        if file_path.suffix.lower() in ALLOWED_IMAGE_EXTENSIONS:
            files.append(file_path)
    return files


def build_records(dataset_root: Path) -> pd.DataFrame:
    rows: List[Dict[str, str]] = []

    for file_path in find_image_files(dataset_root):
        class_name = file_path.parent.name
        crop, disease = parse_crop_and_disease(class_name)
        if crop not in SUPPORTED_CROPS:
            continue

        rows.append(
            {
                "path": str(file_path),
                "class_name": class_name,
                "crop": crop,
                "disease": disease,
            }
        )

    df = pd.DataFrame(rows)
    if df.empty:
        supported_list = ", ".join(sorted(SUPPORTED_CROPS))
        raise ValueError(
            f"No images found for supported crops: {supported_list}. "
            "Verify dataset path and folder structure (format: Crop___Disease/image.jpg)"
        )

    class_names = sorted(df["class_name"].unique().tolist())
    class_to_idx = {name: idx for idx, name in enumerate(class_names)}
    df["label"] = df["class_name"].map(class_to_idx)

    return df


def make_stratified_splits(
    df: pd.DataFrame,
    seed: int = 42,
    train_size: float = 0.70,
    val_size: float = 0.15,
    test_size: float = 0.15,
) -> SplitData:
    if not np.isclose(train_size + val_size + test_size, 1.0):
        raise ValueError("Train/val/test sizes must sum to 1.0")

    train_df, temp_df = train_test_split(
        df,
        test_size=(1.0 - train_size),
        random_state=seed,
        stratify=df["label"],
    )

    relative_test_size = test_size / (val_size + test_size)

    val_df, test_df = train_test_split(
        temp_df,
        test_size=relative_test_size,
        random_state=seed,
        stratify=temp_df["label"],
    )

    return SplitData(train=train_df, val=val_df, test=test_df)


def save_splits_csv(splits: SplitData, output_path: Path) -> None:
    train_df = splits.train.copy()
    val_df = splits.val.copy()
    test_df = splits.test.copy()

    train_df["split"] = "train"
    val_df["split"] = "val"
    test_df["split"] = "test"

    combined = pd.concat([train_df, val_df, test_df], axis=0, ignore_index=True)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    combined.to_csv(output_path, index=False)


def compute_class_weights(labels: np.ndarray, num_classes: int) -> torch.Tensor:
    counts = np.bincount(labels, minlength=num_classes)
    counts = np.where(counts == 0, 1, counts)
    weights = 1.0 / counts
    weights = weights / weights.sum() * num_classes
    return torch.tensor(weights, dtype=torch.float32)


def build_weighted_sampler(labels: np.ndarray, num_classes: int) -> WeightedRandomSampler:
    counts = np.bincount(labels, minlength=num_classes)
    counts = np.where(counts == 0, 1, counts)
    sample_weights = np.array([1.0 / counts[label] for label in labels], dtype=np.float64)
    return WeightedRandomSampler(
        weights=torch.from_numpy(sample_weights),
        num_samples=len(sample_weights),
        replacement=True,
    )
