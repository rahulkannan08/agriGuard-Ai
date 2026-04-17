import os
from pathlib import Path

base = r'C:\Users\rahul\OneDrive\Pictures\aiii\training\archive (1)'
root = Path(base)

# Count directories and files
print("Exploring new dataset structure...")
print("=" * 60)

# List one level deep
for item in root.iterdir():
    if item.is_dir():
        jpg_count = len(list(item.rglob('*.jpg')))
        png_count = len(list(item.rglob('*.png')))
        total = jpg_count + png_count
        print(f"\nFolder: {item.name}")
        print(f"  Images: {total} (.jpg: {jpg_count}, .png: {png_count})")
        
        # Show subdirectories
        subdirs = [d.name for d in item.iterdir() if d.is_dir()]
        if subdirs[:5]:
            print(f"  Subdirs: {', '.join(subdirs[:5])}")

print("\n" + "=" * 60)
print("Total images in archive (1):")
jpg = len(list(root.rglob('*.jpg')))
png = len(list(root.rglob('*.png')))
print(f"  JPG: {jpg}, PNG: {png}, Total: {jpg + png}")
