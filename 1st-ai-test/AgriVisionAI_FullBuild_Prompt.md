# Master Prompt To Build AgriVisionAI (KaggleHub + NVIDIA API)

Copy everything below and paste it into your coding AI assistant.

## Prompt

You are a senior AI engineer. Build a complete local web application for the AgriVisionAI hackathon problem statement.

Project goal:
- User uploads a leaf image.
- System identifies crop type (tomato/apple/grape), tells whether it is fruit crop or vegetable crop, predicts disease class (or healthy), shows confidence and severity.
- If confidence < 0.60 or image is blurry, ask the user to recapture image.
- System then calls NVIDIA API LLM to generate treatment and prevention guidance.

Mandatory tech and behavior requirements:
1. Use Python for training and inference.
2. Use transfer learning CNN model (EfficientNet-B0 preferred, ResNet50 acceptable).
3. Use this exact dataset download method via KaggleHub:

import kagglehub

# Download latest version
path = kagglehub.dataset_download("abdallahalidev/plantvillage-dataset")
print("Path to dataset files:", path)

4. Use only relevant crop classes from dataset: Tomato, Apple, Grape, including healthy classes.
5. Use class imbalance handling (class weights or weighted sampler).
6. Metrics required: Macro F1, Precision, Recall, Confusion Matrix.
7. Add blur detection using Laplacian variance threshold.
8. Add confidence gate at 0.60.
9. Build local web app (FastAPI + simple HTML/JS frontend, or Streamlit).
10. Upload image flow must show:
   - Detected crop name
   - Crop category: Fruit or Vegetable
   - Disease name or Healthy
   - Confidence score
   - Severity (Low/Moderate/High)
11. Integrate NVIDIA API for context-aware recommendations:
   - Organic treatment options
   - Chemical treatment options
   - Recovery estimate
   - Preventive measures
   - Monitoring checklist
   - Safety note
12. Keep inference local for vision model; only recommendation text comes from NVIDIA API.
13. Do not hardcode predictions. Real model inference only.
14. Save model and load it at runtime in under 30 seconds.

NVIDIA API requirements:
- Use a configurable environment variable for key, for example NVIDIA_API_KEY.
- Keep API model name configurable via .env, for example mistral-small-4-119b-2603.
- Add a reusable function call_nvidia_llm(context_dict) that returns structured JSON.
- If NVIDIA API call fails, return a safe fallback response and do not crash app.

Dataset and labeling requirements:
- Build a class mapping from folder names.
- Extract crop from class name.
- Create crop-category map:
  - Tomato -> Vegetable
  - Apple -> Fruit
  - Grape -> Fruit
- Use stratified split train/val/test.

Training requirements:
- Image size 224x224.
- Standard normalization.
- Train augmentations: flip, rotation, color jitter, random crop.
- Use early stopping based on validation Macro F1.
- Save best checkpoint as best_model.pth.
- Export confusion matrix image and classification report.

Inference pipeline requirements:
1. Validate image file type.
2. Compute blur score and reject if too blurry.
3. Run model inference.
4. If confidence < 0.60, show recapture message.
5. Else call NVIDIA API with predicted crop, disease, confidence, location, time, weather.
6. Return final JSON to frontend.

Output format for API response:
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

Deliverables to generate:
1. Full project folder structure.
2. requirements.txt
3. .env.example
4. Training script (train.py)
5. Evaluation script (evaluate.py)
6. Inference service (app.py)
7. NVIDIA client utility module (nvidia_client.py)
8. Frontend upload page (templates/index.html + static assets)
9. README with setup, train, run, and demo instructions.

Code quality requirements:
- Clean modular code.
- Type hints where useful.
- Clear error handling.
- No notebook-only solution.
- Must run locally on Windows.

Now generate:
- First, the folder tree.
- Then provide complete code for each file.
- Then provide exact commands to run training and launch the app.
