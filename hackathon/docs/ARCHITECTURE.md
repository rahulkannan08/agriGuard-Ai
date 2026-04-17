# System Architecture Document
## AgriVision - End-to-End Pipeline

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AGRIVISION SYSTEM                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   STAGE 1    │    │   STAGE 2    │    │   STAGE 3    │    │   STAGE 4    │  │
│  │              │    │              │    │              │    │              │  │
│  │    IMAGE     │───▶│   IMAGE      │───▶│     CNN      │───▶│  PREDICTION  │  │
│  │   CAPTURE    │    │  VALIDATION  │    │   INFERENCE  │    │   OUTPUT     │  │
│  │              │    │              │    │              │    │              │  │
│  │  - Upload    │    │  - Blur      │    │  - EfficientNet   │  - Disease   │  │
│  │  - GPS meta  │    │  - Size      │    │  - 18 classes│    │  - Confidence│  │
│  │  - Preview   │    │  - Format    │    │  - Transfer  │    │  - Severity  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────┬───────┘  │
│                                                                      │         │
│                                                                      ▼         │
│  ┌──────────────┐                                           ┌──────────────┐  │
│  │   STAGE 6    │◀──────────────────────────────────────────│   STAGE 5    │  │
│  │              │                                            │              │  │
│  │   WEB APP    │                                            │     LLM      │  │
│  │     UI       │                                            │   MODULE     │  │
│  │              │                                            │              │  │
│  │  - Results   │                                            │  - Groq API  │  │
│  │  - Recommend │                                            │  - Prompts   │  │
│  │  - Actions   │                                            │  - Context   │  │
│  └──────────────┘                                            └──────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 FRONTEND                                     │
│                          (Streamlit / React)                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Upload    │  │    Crop     │  │   Results   │  │   Recommendations   │ │
│  │  Component  │  │  Selector   │  │    Panel    │  │       Panel         │ │
│  └──────┬──────┘  └──────┬──────┘  └──────▲──────┘  └──────────▲──────────┘ │
└─────────┼────────────────┼────────────────┼─────────────────────┼───────────┘
          │                │                │                     │
          │     HTTP POST /api/analyze      │                     │
          └────────────────┼────────────────┼─────────────────────┘
                           │                │
┌──────────────────────────┼────────────────┼─────────────────────────────────┐
│                          ▼                │            BACKEND              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         API LAYER (FastAPI)                           │  │
│  │   POST /api/analyze    GET /api/health    GET /api/crops              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                           │                                                  │
│         ┌─────────────────┼─────────────────┐                               │
│         ▼                 ▼                 ▼                               │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                       │
│  │   Image     │   │   Disease   │   │    LLM      │                       │
│  │  Processor  │   │ Classifier  │   │   Service   │                       │
│  │             │   │             │   │             │                       │
│  │ - Decode    │   │ - Load model│   │ - Groq API  │                       │
│  │ - Validate  │   │ - Preprocess│   │ - Prompts   │                       │
│  │ - Blur check│   │ - Inference │   │ - Parse     │                       │
│  │ - GPS       │   │ - Severity  │   │ - Fallback  │                       │
│  └─────────────┘   └──────┬──────┘   └──────┬──────┘                       │
│                           │                 │                               │
│                    ┌──────┴──────┐   ┌──────┴──────┐                       │
│                    │   MODEL     │   │   GROQ      │                       │
│                    │   (.h5)     │   │   API       │                       │
│                    └─────────────┘   └─────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow Diagram

```
USER                  FRONTEND              BACKEND                EXTERNAL
 │                       │                     │                      │
 │  Upload Image         │                     │                      │
 │──────────────────────▶│                     │                      │
 │                       │                     │                      │
 │                       │  POST /api/analyze  │                      │
 │                       │  {image, crop}      │                      │
 │                       │────────────────────▶│                      │
 │                       │                     │                      │
 │                       │                     │  Validate Image      │
 │                       │                     │──────┐               │
 │                       │                     │      │               │
 │                       │                     │◀─────┘               │
 │                       │                     │                      │
 │                       │                     │  CNN Inference       │
 │                       │                     │──────┐               │
 │                       │                     │      │ (local)       │
 │                       │                     │◀─────┘               │
 │                       │                     │                      │
 │                       │                     │  LLM Request         │
 │                       │                     │─────────────────────▶│
 │                       │                     │                      │ Groq API
 │                       │                     │  LLM Response        │
 │                       │                     │◀─────────────────────│
 │                       │                     │                      │
 │                       │  Response           │                      │
 │                       │  {prediction,       │                      │
 │                       │   recommendations}  │                      │
 │                       │◀────────────────────│                      │
 │                       │                     │                      │
 │  Display Results      │                     │                      │
 │◀──────────────────────│                     │                      │
 │                       │                     │                      │
```

---

## 4. Directory Structure

```
agrivision/
│
├── README.md                    # Project overview
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment template
├── .gitignore
│
├── docs/                        # Documentation
│   ├── PRD.md                   # Product Requirements
│   ├── ARCHITECTURE.md          # This file
│   ├── BRAINSTORM_FRONTEND.md
│   ├── BRAINSTORM_BACKEND.md
│   ├── BRAINSTORM_ML_MODEL.md
│   └── BRAINSTORM_LLM_INTEGRATION.md
│
├── data/                        # Dataset (gitignored)
│   ├── raw/                     # Original PlantVillage
│   ├── processed/               # Filtered & augmented
│   └── test_images/             # Validation images
│
├── model/                       # Trained model files
│   ├── model.h5                 # Keras model weights
│   ├── model.tflite             # Optimized (optional)
│   ├── class_labels.json        # Class mapping
│   └── model_config.json        # Architecture config
│
├── notebooks/                   # Training notebooks
│   ├── 01_data_exploration.ipynb
│   ├── 02_model_training.ipynb
│   └── 03_evaluation.ipynb
│
├── backend/                     # Backend application
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI entry
│   │   ├── config.py            # Settings
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── analyze.py       # /api/analyze
│   │   │   ├── health.py        # /api/health
│   │   │   └── crops.py         # /api/crops
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── image_processor.py
│   │   │   ├── disease_classifier.py
│   │   │   └── llm_service.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── requests.py
│   │   │   └── responses.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── blur_detector.py
│   │       └── gps_utils.py
│   └── tests/
│       ├── test_analyze.py
│       └── test_services.py
│
├── frontend/                    # Frontend (if React)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── App.jsx
│   └── package.json
│
├── streamlit_app/               # Frontend (if Streamlit)
│   └── app.py                   # Single file app
│
├── reports/                     # Evaluation outputs
│   ├── confusion_matrix.png
│   ├── metrics.json
│   └── evaluation_report.md
│
└── scripts/                     # Utility scripts
    ├── download_data.py
    ├── prepare_data.py
    └── train_model.py
```

---

## 5. API Specification

### 5.1 POST /api/analyze

**Request:**
```json
{
  "image": "base64_encoded_image_string",
  "crop_type": "tomato | apple | grape | auto",
  "include_gps": true
}
```

**Response (Success):**
```json
{
  "success": true,
  "prediction": {
    "disease": "Tomato___Early_blight",
    "disease_name": "Early Blight",
    "crop": "Tomato",
    "confidence": 0.94,
    "confidence_status": "high",
    "severity": "moderate",
    "top_predictions": {
      "Early Blight": 0.94,
      "Late Blight": 0.04,
      "Septoria": 0.01
    }
  },
  "validation": {
    "blur_score": 245.6,
    "is_blurry": false,
    "file_valid": true
  },
  "location": {
    "latitude": 12.9141,
    "longitude": 74.8560,
    "region": "Mangalore",
    "state": "Karnataka"
  },
  "recommendations": {
    "summary": "Early Blight detected with high confidence...",
    "immediate_actions": [
      "Remove infected leaves",
      "Avoid overhead watering"
    ],
    "organic_treatment": [
      {
        "method": "Neem Oil Spray",
        "dosage": "5ml/liter",
        "frequency": "Every 7 days"
      }
    ],
    "chemical_treatment": [
      {
        "name": "Chlorothalonil",
        "dosage": "2g/liter",
        "precautions": "Wear protective gear"
      }
    ],
    "recovery_time": "14-21 days",
    "preventive_measures": [
      "Crop rotation",
      "Improve drainage"
    ],
    "weather_advisory": "Apply before monsoon onset"
  },
  "metadata": {
    "inference_time_ms": 1250,
    "model_version": "1.0.0",
    "timestamp": "2026-04-01T10:30:00Z"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": {
    "code": "BLUR_DETECTED",
    "message": "Image is too blurry. Please capture a clearer photo.",
    "details": {
      "blur_score": 45.2,
      "threshold": 100.0
    }
  }
}
```

### 5.2 GET /api/health

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_version": "1.0.0",
  "llm_available": true,
  "timestamp": "2026-04-01T10:00:00Z"
}
```

### 5.3 GET /api/crops

**Response:**
```json
{
  "crops": [
    {
      "id": "tomato",
      "name": "Tomato",
      "icon": "🍅",
      "diseases": [
        "Bacterial Spot",
        "Early Blight",
        "Late Blight",
        "Leaf Mold",
        "Septoria Leaf Spot",
        "Spider Mites",
        "Target Spot",
        "Yellow Leaf Curl Virus",
        "Mosaic Virus"
      ]
    },
    {
      "id": "apple",
      "name": "Apple",
      "icon": "🍎",
      "diseases": [
        "Apple Scab",
        "Black Rot",
        "Cedar Apple Rust"
      ]
    },
    {
      "id": "grape",
      "name": "Grape",
      "icon": "🍇",
      "diseases": [
        "Black Rot",
        "Esca (Black Measles)",
        "Leaf Blight"
      ]
    }
  ]
}
```

---

## 6. Technology Stack Summary

### Option A: Next.js Full-Stack (Recommended)
| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 14 | Unified frontend + backend |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Rapid UI development |
| ML Inference | ONNX Runtime Web / Python API | Disease classification |
| LLM | NVIDIA NIM API (LLAMA 3.1) | Treatment recommendations |

### Option B: Python + React (Alternative)
| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Streamlit / React | Fast prototyping / Rich UI |
| Backend | FastAPI | Async, auto-docs, validation |
| ML Framework | TensorFlow/Keras | EfficientNet, easy serving |
| LLM | NVIDIA NIM API (LLAMA 3.1) | Treatment recommendations |

---

## 7. Deployment Checklist

### Local Development
```bash
# 1. Clone repository
git clone https://github.com/your-team/agrivision.git
cd agrivision

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # or: venv\Scripts\activate (Windows)

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env with your GROQ_API_KEY

# 5. Download/place model files
# Place model.h5 and class_labels.json in model/

# 6. Run backend
cd backend
uvicorn app.main:app --reload --port 8000

# 7. Run frontend (separate terminal)
cd streamlit_app
streamlit run app.py

# OR (if React)
cd frontend
npm install
npm run dev
```

### Demo Checklist
- [ ] Backend starts without errors
- [ ] Model loads in < 30 seconds
- [ ] Health endpoint returns healthy
- [ ] Can upload test image
- [ ] Blur detection works
- [ ] Prediction returns correctly
- [ ] LLM recommendations generate
- [ ] UI displays all information
- [ ] Error cases handled gracefully

---

## 8. Security Considerations

1. **API Key Protection**
   - Never commit `.env` files
   - Use environment variables

2. **Input Validation**
   - File type checking
   - Size limits (10MB)
   - Base64 validation

3. **Rate Limiting**
   - Consider adding for production
   - LLM calls are rate-limited by provider

4. **Error Handling**
   - Never expose internal errors to users
   - Log errors securely

---

*Architecture Document - AgriVision Team*
