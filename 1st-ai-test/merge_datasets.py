from pathlib import Path
import shutil
import os

# Paths
existing = Path(r'C:\Users\rahul\OneDrive\Pictures\aiii\archive\plantvillage dataset\color')
new_data_path = Path(r'C:\Users\rahul\OneDrive\Pictures\aiii\training')
new_combined = Path(r'C:\Users\rahul\OneDrive\Pictures\aiii\1st-ai-test\combined_data')

print("Merging datasets...")
print("=" * 70)

# Create combined folder
new_combined.mkdir(exist_ok=True)

# Copy existing data first
existing_count = 0
for class_dir in existing.iterdir():
    if class_dir.is_dir():
        target = new_combined / class_dir.name
        target.mkdir(exist_ok=True)
        for img in class_dir.glob('*'):
            if img.is_file():
                shutil.copy2(img, target / img.name)
                existing_count += 1

print(f"✓ Copied {existing_count} existing images")

# Copy from new archives
new_count = 0
for archive in ['archive (1)', 'archive (2)', 'archive (3)']:
    archive_path = new_data_path / archive
    if not archive_path.exists():
        continue
    
    # Find the actual data folder (might be nested)
    data_folders = []
    for p in archive_path.rglob('*'):
        if p.is_dir() and any(f.suffix.lower() in ['.jpg', '.png'] for f in p.iterdir()):
            data_folders.append(p)
            break
    
    if data_folders:
        data_folder = data_folders[0]
        for class_dir in data_folder.iterdir():
            if class_dir.is_dir():
                target = new_combined / class_dir.name
                target.mkdir(exist_ok=True)
                for img in class_dir.glob('*'):
                    if img.is_file() and img.suffix.lower() in ['.jpg', '.png']:
                        shutil.copy2(img, target / img.name)
                        new_count += 1
        print(f"✓ Copied {new_count} images from {archive}")

print("=" * 70)
print(f"Total images in combined dataset: {existing_count + new_count:,}")

# Count by class
print("\nClasses in combined dataset:")
for cls_dir in sorted(new_combined.iterdir()):
    if cls_dir.is_dir():
        count = len(list(cls_dir.glob('*')))
        print(f"  {cls_dir.name}: {count}")
