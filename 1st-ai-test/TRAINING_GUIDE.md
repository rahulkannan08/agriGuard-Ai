# AgriVisionAI - Training Guide

## Overview
This guide walks you through setting up and running the AgriVisionAI crop disease classifier training pipeline.

## Prerequisites Checklist

### 1. Python Environment ✓
- Python 3.10+ (you have Python 3.12.10) ✓
- Virtual environment created ✓
- Dependencies installed ✓

### 2. Kaggle Credentials (REQUIRED)
**Steps to obtain:**
1. Go to https://www.kaggle.com/settings/account
2. Scroll to "API" section and click "Create New API Token"
3. This downloads `kaggle.json`
4. Place the file at: `%USERPROFILE%\.kaggle\kaggle.json`

**Verify:** Run this in PowerShell:
```powershell
Test-Path $env:USERPROFILE\.kaggle\kaggle.json
```

### 3. Dataset Configuration
The training script automatically downloads the PlantVillage dataset (~3-4 GB) using the credentials above. The first run will take time to download.

## Training Steps

### Quick Start (Default Settings)
```powershell
cd c:\Users\sha\Documents\rapid\ai-for-hackathon-mangluru\ai\1st-ai-test
.\.venv\Scripts\Activate.ps1
python train.py
```

This will:
- Download dataset from Kaggle if not cached (~10-15 minutes)
- Create train/val/test splits (70/15/15)
- Train EfficientNet-B0 for 25 epochs
- Freeze backbone for first 5 epochs, then fine-tune all layers
- Save model to `artifacts/best_model.pth`
- Generate training reports in `reports/` folder

### Advanced Training Options

**Use ResNet50 instead:**
```powershell
python train.py --arch resnet50 --epochs 30
```

**Increase training duration:**
```powershell
python train.py --epochs 50 --freeze-epochs 10
```

**Larger batch size (if GPU memory allows):**
```powershell
python train.py --batch-size 64
```

**Full custom configuration:**
```powershell
python train.py `
  --arch efficientnet_b0 `
  --epochs 40 `
  --freeze-epochs 8 `
  --batch-size 32 `
  --lr-head 0.001 `
  --lr-finetune 0.0001 `
  --weight-decay 0.0001 `
  --patience 5
```

## Training Parameters Explained

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--arch` | `efficientnet_b0` | Model architecture: `efficientnet_b0` or `resnet50` |
| `--epochs` | `25` | Total training epochs |
| `--freeze-epochs` | `5` | Epochs where backbone is frozen (head-only training) |
| `--batch-size` | `32` | Batch size for training |
| `--num-workers` | `2` | Data loading workers |
| `--lr-head` | `0.001` | Learning rate for head-only phase |
| `--lr-finetune` | `0.0001` | Learning rate for fine-tuning phase |
| `--weight-decay` | `0.0001` | L2 regularization strength |
| `--patience` | `5` | Early stopping patience |
| `--seed` | `42` | Random seed for reproducibility |

## Training Pipeline

1. **Dataset Setup** (Dataset download + preparation)
   - Downloads PlantVillage dataset via kagglehub
   - Filters for Tomato, Apple, Grape crops
   - Creates stratified train/val/test splits
   - Applies class weights for imbalanced data

2. **Model Initialization**
   - Loads pre-trained model (ImageNet weights)
   - Initializes classification head for disease classes

3. **Phase 1: Head-Only Training** (Epochs 1-5 by default)
   - Frozen backbone (pre-trained ImageNet weights)
   - Only trains the custom classification head
   - Higher learning rate (0.001)

4. **Phase 2: Fine-Tuning** (Epochs 6+ by default)
   - Unfreezes all layers
   - Fine-tunes entire model
   - Lower learning rate (0.0001)

5. **Evaluation**
   - Tracks: F1 score, precision, recall, confusion matrix
   - Saves best model based on validation F1
   - Generates classification report

## Output Files

After training, check these outputs:

### Model Artifacts (`artifacts/`)
- `best_model.pth` - Best model weights
- `model_meta.json` - Class names and mapping
- `splits.csv` - Train/val/test file splits

### Training Reports (`reports/`)
- `training_history.csv` - Epoch-by-epoch metrics
- `classification_report.csv` - Per-class precision/recall/F1
- `confusion_matrix.png` - Visualization
- `metrics_summary.json` - Final metrics summary

## Common Issues & Solutions

### Issue: "No module named 'kagglehub'"
**Solution:** Reinstall dependencies:
```powershell
.\.venv\Scripts\pip install -r requirements.txt
```

### Issue: "Dataset not found / No Tomato/Apple/Grape images"
**Solution:** 
1. Ensure Kaggle credentials are correct
2. Clear kagglehub cache: `Remove-Item $env:USERPROFILE\.cache\kagglehub -Force -Recurse`
3. Re-run training to force re-download

### Issue: CUDA out of memory
**Solution:** Reduce batch size:
```powershell
python train.py --batch-size 16
```

### Issue: Training is very slow
**Solution:**
- Reduce `--num-workers` to 0 or 1
- Use GPU (CUDA) - script auto-detects
- Check CPU/GPU usage with Task Manager

## Training Time Estimates

### First Run (with dataset download)
- **Dataset download:** 10-15 minutes
- **Training (25 epochs):** 20-40 minutes (GPU) / 2-4 hours (CPU)

### Subsequent Runs (cached dataset)
- **Training (25 epochs):** 20-40 minutes (GPU) / 2-4 hours (CPU)

## Next Steps After Training

1. **Run Evaluation:**
   ```powershell
   python evaluate.py
   ```

2. **Test the Web UI:**
   ```powershell
   cp .env.example .env  # Then configure NVIDIA_API_KEY
   python app.py
   ```
   Open browser to `http://localhost:8000`

3. **Analyze Metrics:**
   - View `reports/classification_report.csv`
   - View `reports/confusion_matrix.png`
   - Check `reports/training_history.csv` for convergence patterns

## Device Detection

The script automatically uses:
- **GPU (CUDA)** if available - for 20-40 minute training
- **CPU** as fallback - for 2-4 hour training

Check device:
```powershell
.\.venv\Scripts\python -c "import torch; print(f'GPU available: {torch.cuda.is_available()}')"
```
