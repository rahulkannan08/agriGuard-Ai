from pathlib import Path

base = r'C:\Users\rahul\OneDrive\Pictures\aiii\training'

# Check all archives
print("New Dataset Summary")
print("=" * 70)

total_images = 0
for archive_dir in ['archive (1)', 'archive (2)', 'archive (3)']:
    path = Path(base) / archive_dir
    if path.exists():
        jpg = len(list(path.rglob('*.jpg')))
        png = len(list(path.rglob('*.png')))
        total = jpg + png
        total_images += total
        print(f"{archive_dir}: {total:,} images")

print("=" * 70)
print(f"TOTAL NEW IMAGES: {total_images:,}")
print()

# Check class structure in first archive
first_archive = Path(base) / 'archive (1)' / 'New Plant Diseases Dataset(Augmented)' / 'New Plant Diseases Dataset(Augmented)'
if first_archive.exists():
    classes = [d.name for d in first_archive.iterdir() if d.is_dir()]
    print(f"Classes found: {len(classes)}")
    print("\nSample classes:")
    for cls in sorted(classes)[:10]:
        img_count = len(list((first_archive / cls).glob('*.jpg')))
        print(f"  {cls}: {img_count} images")
