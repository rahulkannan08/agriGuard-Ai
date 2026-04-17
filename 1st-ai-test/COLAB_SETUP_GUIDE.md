# 🚀 Google Colab Training Guide - Complete Setup

This guide shows how to train your crop disease classifier **10x faster** on Google Colab with free/Pro GPU access.

---

## 📋 Prerequisites

1. **Google Account** (free or Colab Pro $10/month)
2. **Google Drive access** (15GB free storage)
3. **Your dataset** (142K images - ~5-10GB)

---

## ⚡ Step 1: Prepare Your Files

### Upload Your Code to Google Drive:
1. Go to [Google Drive](https://drive.google.com)
2. Create a new folder: `AgriVision`
3. Inside, create subfolder: `code`
4. Upload these files from `1st-ai-test/`:
   - `app.py`
   - `config.py`
   - `data_utils.py`
   - `evaluate.py`
   - `model_utils.py`
   - `nvidia_client.py`
   - `train.py`
   - `requirements.txt`

### Upload Your Dataset:
1. Create subfolder: `AgriVision/data`
2. Upload your 142K images folder structure (can compress as ZIP first for faster upload)

**Your Google Drive Structure Should Look Like:**
```
MyDrive/
├── AgriVision/
│   ├── code/
│   │   ├── train.py
│   │   ├── config.py
│   │   ├── model_utils.py
│   │   ├── data_utils.py
│   │   ├── app.py
│   │   ├── evaluate.py
│   │   ├── nvidia_client.py
│   │   └── requirements.txt
│   ├── data/
│   │   ├── train/ (142K images)
│   │   └── valid/ (if available)
│   └── artifacts/ (will be created by training)
```

---

## 🎯 Step 2: Create Colab Notebook

1. Go to [Google Colab](https://colab.research.google.com)
2. Click **File → New notebook**
3. Name it: `AgriVision_Training`
4. Copy-paste the code cells below in order

---

## 💻 Colab Code - Cell by Cell

### **Cell 1: Mount Google Drive**
```python
from google.colab import drive
drive.mount('/content/drive')
print("✅ Google Drive mounted!")
```

---

### **Cell 2: Check GPU**
```python
import torch

print(f"PyTorch Version: {torch.__version__}")
print(f"GPU Available: {torch.cuda.is_available()}")
print(f"GPU Name: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None'}")
print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB" if torch.cuda.is_available() else "N/A")
```

*Expected Output: A100 or V100 GPU with 40GB+ VRAM*

---

### **Cell 3: Install Dependencies**
```python
!pip install -q torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
!pip install -q scikit-learn pillow numpy pandas fastapi uvicorn

print("✅ All dependencies installed!")
```

---

### **Cell 4: Copy Code to Colab**
```python
import os
import shutil

# Create working directory
os.makedirs('/content/workspace', exist_ok=True)
os.chdir('/content/workspace')

# Copy code files
source_code = '/content/drive/My Drive/AgriVision/code'
for file in os.listdir(source_code):
    if file.endswith(('.py', '.txt')):
        shutil.copy(f'{source_code}/{file}', f'/content/workspace/{file}')

print("✅ Code files copied!")
print(os.listdir('/content/workspace'))
```

---

### **Cell 5: Verify Dataset Structure**
```python
import os

dataset_path = '/content/drive/My Drive/AgriVision/data/train'

if os.path.exists(dataset_path):
    class_dirs = os.listdir(dataset_path)
    total_images = 0
    for class_name in class_dirs:
        class_path = os.path.join(dataset_path, class_name)
        if os.path.isdir(class_path):
            num_images = len([f for f in os.listdir(class_path) if f.lower().endswith(('.jpg', '.png', '.jpeg'))])
            total_images += num_images
            print(f"{class_name}: {num_images} images")
    
    print(f"\n📊 Total Images: {total_images}")
    print(f"📂 Number of Classes: {len(class_dirs)}")
else:
    print(f"❌ Dataset not found at {dataset_path}")
    print("Make sure you uploaded data to: AgriVision/data/train/")
```

---

### **Cell 6: Start Training (MAIN TRAINING SCRIPT)**
```python
import os
os.chdir('/content/workspace')

# Configuration
dataset_path = '/content/drive/My Drive/AgriVision/data/train'
output_dir = '/content/drive/My Drive/AgriVision/artifacts'
os.makedirs(output_dir, exist_ok=True)

# Run training
import subprocess
import sys

cmd = [
    sys.executable, 'train.py',
    '--dataset-path', dataset_path,
    '--epochs', '30',
    '--batch-size', '128',  # Colab can handle larger batch size!
    '--freeze-epochs', '8',
    '--lr', '0.001',
    '--lr-finetune', '0.0001',
    '--output-dir', output_dir
]

print(f"🚀 Starting training with command:")
print(' '.join(cmd))
print("\n" + "="*70)

result = subprocess.run(cmd, capture_output=False)
sys.exit(result.returncode)
```

---

### **Cell 7: Monitor GPU During Training** (Run in parallel cell)
```python
import subprocess
import time

while True:
    result = subprocess.run(['nvidia-smi', '--query-gpu=gpu_name,memory.used,memory.total', '--format=csv,noheader'], 
                          capture_output=True, text=True)
    print(result.stdout.strip())
    time.sleep(5)
```

---

### **Cell 8: Check Training Results**
```python
import os
import json

artifacts_dir = '/content/drive/My Drive/AgriVision/artifacts'

files = os.listdir(artifacts_dir) if os.path.exists(artifacts_dir) else []
print("📁 Artifacts created:")
for f in files:
    size = os.path.getsize(f'{artifacts_dir}/{f}') / 1e6  # MB
    print(f"  - {f} ({size:.1f} MB)")

# Check if model metadata exists
meta_file = f'{artifacts_dir}/model_meta.json'
if os.path.exists(meta_file):
    with open(meta_file) as f:
        meta = json.load(f)
    print(f"\n✅ Model Info:")
    print(f"   Architecture: {meta.get('arch', 'unknown')}")
    print(f"   Classes: {len(meta.get('class_names', []))}")
```

---

### **Cell 9: Download Your Model** (After Training Completes)
```python
from google.colab import files
import os

artifacts_dir = '/content/drive/My Drive/AgriVision/artifacts'

# Download best model
if os.path.exists(f'{artifacts_dir}/best_model.pth'):
    files.download(f'{artifacts_dir}/best_model.pth')
    print("✅ Downloading best_model.pth...")

# Download metadata
if os.path.exists(f'{artifacts_dir}/model_meta.json'):
    files.download(f'{artifacts_dir}/model_meta.json')
    print("✅ Downloading model_meta.json...")

# Download training reports
if os.path.exists(f'{artifacts_dir}/training_log.csv'):
    files.download(f'{artifacts_dir}/training_log.csv')
    print("✅ Downloading training_log.csv...")
```

---

## 🎬 Quick Start Steps

1. **Upload data** to Google Drive (Section 1)
2. **Create notebook** in Colab (Section 2)
3. **Paste cells 1-9** in order
4. **Run Cell 1** (mount drive)
5. **Run Cell 2** (check GPU - should show A100/V100)
6. **Run Cell 3** (install packages)
7. **Run Cell 4** (copy code)
8. **Run Cell 5** (verify dataset)
9. **Run Cell 6** (start training) ← **MAIN TRAINING**
10. Run Cell 9 when done (download model)

---

## ⚙️ Performance Comparison

| Parameter | Local (RTX 3050) | Colab (A100) | Speedup |
|-----------|-----------------|------------|---------|
| Batch Size | 64 | 256 | 4x |
| Epochs/Hour | ~8 epochs | ~50+ epochs | **6-8x** |
| Training Time (30 epochs) | 2-4 hours | 15-20 minutes | **🔥 10x FASTER** |
| Cost | $0 (electricity) | $0 (free) or $10 (Pro) | Same/Better |

---

## 🐛 Troubleshooting

### **"Dataset not found"**
- Check Google Drive path is correct
- Verify folder structure matches guide
- Try uploading as ZIP, then unzip in Cell 4

### **Out of Memory (OOM)**
- Reduce batch size: `--batch-size 64` (instead of 128)
- In Cell 6, change: `'--batch-size', '64'`

### **GPU Not Available**
- Go to **Runtime → Change runtime type**
- Select **GPU** and run again

### **Slow Upload**
- Compress dataset as ZIP first
- Upload ZIP, then add unzip step in Cell 4

---

## 📊 Expected Results

After ~15-20 minutes on A100:
- ✅ Model F1 Score: **>0.98**
- ✅ Validation Loss: **<0.05**
- ✅ Files saved to Google Drive automatically
- ✅ Ready to download & deploy locally

---

## 🚀 Next Steps After Training

### Option A: Use Locally
1. Run Cell 9 to download files
2. Copy `best_model.pth` + `model_meta.json` to `artifacts/`
3. Run `python app.py` locally

### Option B: Deploy to Cloud
1. Upload to **AWS SageMaker**, **Heroku**, or **Railway**
2. Update app configuration
3. Share web interface

---

## 💡 Pro Tips

- **Free Tier**: 12 hours/day, RTX T4 GPU
- **Colab Pro** ($10/month): Unlimited, A100 GPU
- **Save Checkpoints**: Every epoch to Google Drive
- **Interrupt Gracefully**: Run `Ctrl+C` in cell to stop safely

---

## 📞 Support

If training fails, check:
1. GPU is selected (Runtime → GPU)
2. Google Drive is mounted
3. Dataset path is correct
4. Sufficient storage in Drive (~15GB free)

---

**Happy Training! 🌾🤖**
