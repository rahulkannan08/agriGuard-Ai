# AgriVision - AI Crop Intelligence System

> Matrix Fusion 4.0 - AI Hackathon 2026 | Yenepoya Institute of Technology

AI-powered crop disease detection and treatment recommendation system for sustainable agriculture.

---

## Overview

AgriVision is an end-to-end AI system that:
1. Analyzes crop leaf images using CNN (EfficientNet)
2. Detects diseases across Tomato, Apple, and Grape crops
3. Provides geo-aware treatment recommendations via LLM

**Target Users:** Field agronomists at Mist Agri Corps Ltd (3,000+ acres)

---

## Features

| Feature | Status |
|---------|--------|
| Image Upload & Preview | Required |
| Blur Detection | Required |
| CNN Disease Classification (18 classes) | Required |
| Confidence Gating (60% threshold) | Required |
| LLM Treatment Recommendations | Required |
| GPS-based Location Context | Nice-to-have |
| Weather Advisory | Nice-to-have |

---

## Quick Start

### Prerequisites
- Python 3.9+
- NVIDIA API key (free: https://build.nvidia.com/)
- Trained model files (model.h5, class_labels.json)

### Installation

```bash
# Clone repository
git clone https://github.com/your-team/agrivision.git
cd agrivision

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Add your NVIDIA_API_KEY to .env (get free key from build.nvidia.com)
```

### Running the Application

```bash
# Start backend
cd backend
uvicorn app.main:app --reload --port 8000

# Start frontend (new terminal)
cd streamlit_app
streamlit run app.py
```

Open http://localhost:8501 in your browser.

---

## Project Structure

```
agrivision/
├── docs/                    # Documentation
│   ├── PRD.md              # Product Requirements
│   ├── ARCHITECTURE.md     # System Architecture
│   ├── BRAINSTORM_*.md     # Design Documents
├── model/                   # Trained ML models
├── backend/                 # FastAPI backend
├── streamlit_app/           # Streamlit frontend
├── notebooks/               # Training notebooks
└── reports/                 # Evaluation metrics
```

---

## Pipeline Stages

```
┌─────────┐    ┌────────────┐    ┌────────┐    ┌────────────┐    ┌─────┐    ┌────────┐
│ Upload  │───▶│ Preprocess │───▶│  CNN   │───▶│ Prediction │───▶│ LLM │───▶│ Web UI │
│ Image   │    │ & Validate │    │ Model  │    │ + Severity │    │     │    │        │
└─────────┘    └────────────┘    └────────┘    └────────────┘    └─────┘    └────────┘
```

---

## Supported Crops & Diseases

### Tomato (10 diseases)
- Bacterial Spot, Early Blight, Late Blight
- Leaf Mold, Septoria Leaf Spot, Spider Mites
- Target Spot, Yellow Leaf Curl Virus, Mosaic Virus
- Healthy

### Apple (3 diseases + healthy)
- Apple Scab, Black Rot, Cedar Apple Rust, Healthy

### Grape (3 diseases + healthy)
- Black Rot, Esca (Black Measles), Leaf Blight, Healthy

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/analyze | Analyze crop image |
| GET | /api/health | System health check |
| GET | /api/crops | List supported crops |

---

## Model Performance

| Metric | Target | Achieved |
|--------|--------|----------|
| Macro F1 | > 0.90 | TBD |
| Precision | > 0.88 | TBD |
| Recall | > 0.88 | TBD |
| Inference Time | < 3s | TBD |

---

## Technology Stack

### Option A: Next.js Full-Stack (Recommended)
- **Framework:** Next.js 14 (React + API Routes)
- **Language:** TypeScript
- **ML:** ONNX Runtime Web / Python microservice
- **LLM:** NVIDIA NIM API (LLAMA 3.1-70B)
- **Styling:** Tailwind CSS

### Option B: Python + Streamlit
- **Frontend:** Streamlit / React
- **Backend:** FastAPI
- **ML:** TensorFlow/Keras (EfficientNetB0)
- **LLM:** NVIDIA NIM API (LLAMA 3.1-70B)
- **Dataset:** PlantVillage (Kaggle)

---

## Documentation

| Document | Description |
|----------|-------------|
| [PRD.md](docs/PRD.md) | Product Requirements Document |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System Architecture |
| [BRAINSTORM_FRONTEND.md](docs/BRAINSTORM_FRONTEND.md) | Frontend Design Ideas |
| [BRAINSTORM_BACKEND.md](docs/BRAINSTORM_BACKEND.md) | Backend Architecture (Python) |
| [BRAINSTORM_BACKEND_NEXTJS.md](docs/BRAINSTORM_BACKEND_NEXTJS.md) | Backend Architecture (Next.js) |
| [BRAINSTORM_ML_MODEL.md](docs/BRAINSTORM_ML_MODEL.md) | ML Training Strategy |
| [BRAINSTORM_LLM_INTEGRATION.md](docs/BRAINSTORM_LLM_INTEGRATION.md) | LLM Integration (NVIDIA) |

---

## Team

| Role | Name |
|------|------|
| Team Lead | |
| ML Engineer | |
| Backend Developer | |
| Frontend Developer | |

---

## License

MIT License - Hackathon Project

---

## Acknowledgments

- Yenepoya Institute of Technology
- Kokos.ai
- PlantVillage Dataset (Kaggle)
- Groq (LLM API)

---

*Built for Matrix Fusion 4.0 - AI Hackathon 2026*
