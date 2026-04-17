import csv
from collections import defaultdict

csv_path = r'c:\Users\rahul\OneDrive\Pictures\aiii\1st-ai-test\artifacts\splits.csv'

splits = defaultdict(int)
val_by_class = defaultdict(int)

with open(csv_path) as f:
    reader = csv.DictReader(f)
    for row in reader:
        split = row['split']
        splits[split] += 1
        if split == 'val':
            val_by_class[row['class_name']] += 1

total = sum(splits.values())
print("Validation Data Summary")
print("=" * 50)
print(f"Total samples: {total}")
print(f"Train samples: {splits['train']} ({100*splits['train']/total:.1f}%)")
print(f"Val samples: {splits['val']} ({100*splits['val']/total:.1f}%)")
print(f"Test samples: {splits['test']} ({100*splits['test']/total:.1f}%)")
print("\nValidation Data by Class:")
print("-" * 50)
for cls in sorted(val_by_class.keys()):
    print(f"{cls}: {val_by_class[cls]}")
