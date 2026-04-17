# AgriVisionAI (Hackathon Build)

End-to-end local AI system for crop disease intelligence:
- Vision model predicts crop and disease from uploaded leaf image.
- Guardrails reject blurry or low-confidence predictions.
- NVIDIA API generates treatment and preventive recommendations.
- Web UI runs on localhost for live judging.

## Features

- Transfer learning model: EfficientNet-B0 (default) or ResNet50
- Dataset download with KaggleHub:

```python
import kagglehub

# Download latest version
path = kagglehub.dataset_download("abdallahalidev/plantvillage-dataset")
print("Path to dataset files:", path)
```

- Crop scope: Tomato, Apple, Grape
- Crop category output:
  - Tomato -> Vegetable
  - Apple -> Fruit
  - Grape -> Fruit
- Metrics: Macro F1, Precision, Recall, Confusion Matrix
- Blur detection (Laplacian variance)
- Confidence gate at 0.60
- NVIDIA API integration with safe fallback behavior

## Project Structure

```text
1st-ai-test/
  app.py
  train.py
  evaluate.py
  nvidia_client.py
  config.py
  data_utils.py
  model_utils.py
  requirements.txt
  .env.example
  templates/
    index.html
  static/
    styles.css
    app.js
  artifacts/                # generated model files
  reports/                  # generated metrics/reports
```

## Prerequisites

- Python 3.10 or newer
- Kaggle credentials configured for KaggleHub
- NVIDIA API key

## Setup (Windows PowerShell)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` and set your NVIDIA key:

```text
NVIDIA_API_KEY=your_key_here
NVIDIA_MODEL=mistralai/mistral-small-4-119b-2603
NVIDIA_API_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_REASONING_EFFORT=high
NVIDIA_MAX_TOKENS=1200
NVIDIA_TEMPERATURE=0.10
NVIDIA_TOP_P=1.00
NVIDIA_STREAM=false
```

## Kaggle Authentication

Ensure Kaggle credentials are configured (for example, `kaggle.json` in your user profile Kaggle folder) so KaggleHub can download the dataset.

## Train

```powershell
python train.py --arch efficientnet_b0 --epochs 25 --freeze-epochs 5 --batch-size 32
```

Training outputs:
- `artifacts/best_model.pth`
- `artifacts/model_meta.json`
- `artifacts/splits.csv`
- `reports/training_history.csv`
- `reports/classification_report.csv`
- `reports/confusion_matrix.png`
- `reports/metrics_summary.json`

## Evaluate

```powershell
python evaluate.py
```

Evaluation outputs:
- `reports/classification_report_eval.csv`
- `reports/confusion_matrix_eval.png`
- `reports/metrics_summary_eval.json`

## Run Local Web App

```powershell
uvicorn app:app --reload
```

Open:
- `http://127.0.0.1:8000`
- Health check: `http://127.0.0.1:8000/health`

## Inference Flow

1. Validate uploaded image extension
2. Compute blur score and reject if below threshold
3. Run local model inference
4. If confidence < 0.60, request recapture
5. If confidence >= 0.60, call NVIDIA API for recommendations
6. Return structured JSON to UI

## API Response Shape

```json
{
  "crop": "Tomato",
  "crop_category": "Vegetable",
  "disease": "Tomato Yellow Leaf Curl Virus",
  "confidence": 0.92,
  "severity": "High",
  "decision": "treat",
  "recommendation": {
    "summary": "...",
    "immediate_actions": ["..."],
    "organic_treatment": ["..."],
    "chemical_treatment": ["..."],
    "recovery_estimate": "14-21 days",
    "preventive_measures": ["..."],
    "monitoring_checklist": ["..."],
    "safety_note": "..."
  }
}
```
