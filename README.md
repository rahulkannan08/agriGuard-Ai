# AgriVision AI (AgriGuard) - Full Project README for Expo Judges

## 1. Project Summary

AgriVision AI is a full-stack agricultural intelligence platform that helps farmers and field teams detect crop diseases early using leaf images, then receive practical treatment guidance (organic + chemical + preventive) with AI support.

This repository contains:

- A Python AI diagnosis engine (computer vision + recommendation generation)
- A secure Node.js backend (authentication, history, heatmap analytics, voice services)
- Two frontends:
  - Next.js full experience (primary integrated demo)
  - React Vite UI prototype (design-heavy farmer UX)

In simple words for farmers:

- "Take a clear photo of a leaf, and the system tells what disease it looks like, how serious it is, and what to do next safely."

---

## 2. Why This Project Matters

### Problem in current agriculture practice

In many farms, disease detection still depends on manual inspection and delayed expert visits.

Common problems:

- Detection happens late -> higher crop loss
- Advice quality changes person to person -> inconsistency
- Farmers may spray wrong chemical or wrong dosage -> cost and safety risk
- Large-area monitoring is difficult without digital tracking

### Existing systems and gaps

There are mobile apps and advisory services, but many are limited by:

- Weak image quality checks
- No confidence gating (overconfident wrong suggestions)
- Generic recommendations not tied to diagnosis context
- Poor traceability (no history, no hotspot pattern visibility)
- Limited multilingual/voice support for real field use

### Our value

AgriVision combines:

- Visual disease screening
- Guardrails (blur and confidence checks)
- Structured recommendations from LLM
- Historical and geospatial outbreak views
- Voice and multilingual support in the application layer

---

## 3. Who Benefits

### Primary users

- Small and medium farmers
- Field agronomists and extension workers

### Secondary users

- Municipality / agriculture officers
- Farm managers handling multiple plots
- Cooperatives and agri-input partners

### Stakeholder benefits

- Farmers: faster first-level diagnosis and clearer immediate actions
- Agronomists: decision support and triage for field visits
- Authorities: heatmap-style trend visibility for local outbreak attention
- Agri companies: lower delay between symptom and intervention

---

## 4. What Is Actually Implemented in This Repository

## Core AI engine (Python)

Location: `1st-ai-test/`

Implemented:

- FastAPI inference service
- PyTorch model loading from artifacts
- Image blur detection
- Confidence-gated diagnosis flow
- AI-based image validation and leaf info extraction
- Fallback to broader AI disease guess for low-confidence cases
- Structured recommendation output

Model artifacts available:

- `artifacts/best_model.pth`
- `artifacts/model_meta.json`
- `artifacts/splits.csv`

Current model class metadata shows 18 PlantVillage classes (Apple, Grape, Tomato disease set).

## Backend API (Node + TypeScript)

Location: `hackathon/backend/`

Implemented:

- Express API with security middleware (helmet, rate limiting)
- MongoDB user authentication (JWT + bcrypt)
- Protected analysis upload route
- Analysis history persistence
- Disease heatmap data generation from stored analyses
- AI follow-up chat endpoint for current diagnosis context
- LiveKit token generation for live voice session
- ElevenLabs TTS endpoint for multilingual audio output

Backend can run in two modes:

- External AI mode: delegates diagnosis to Python service (`USE_EXTERNAL_AI=true`)
- Internal mode: uses mock or ONNX classifier path in Node backend

## Frontend options

### A) Primary integrated frontend (Next.js)

Location: `hackathon/`

Implemented capabilities:

- Login/signup
- Image upload and analysis trigger
- Diagnosis history view
- Disease heatmap view with safety rings
- Analysis-aware AI chat
- Live voice panel integration (LiveKit + caption + TTS flow)
- Language support scaffolding (English, Hindi, Tamil, Telugu, Kannada, Malayalam)

### B) Farmer UI prototype (React Vite)

Location: `demogo/`

Implemented capabilities:

- Rich dashboard UX
- Registration/login screens
- Leaf scan screen
- Advisor, map, catalog, support, settings interfaces
- Profile avatar customizations and upload UX

Note: `demogo/` includes some mock/fallback interaction paths and serves as a product UI prototype layer, while `hackathon/` + `hackathon/backend/` + `1st-ai-test/` is the strongest integrated technical path.

---

## 5. End-to-End Architecture

```text
Farmer Mobile/Web
    |
    | Upload Leaf Image + optional location/time/weather
    v
Next.js / React Frontend
    |
    | POST /api/analyze/upload (JWT)
    v
Node Backend (Express)
    |
    | if USE_EXTERNAL_AI=true
    v
Python AI Service (FastAPI /predict)
    |
    | 1) Image checks (format, blur, AI validation)
    | 2) Model inference (crop + disease + confidence)
    | 3) Confidence gate and fallback logic
    | 4) LLM recommendation generation
    v
Structured JSON diagnosis + treatment plan
    |
    v
Node stores analysis history (MongoDB)
    |
    +--> /api/analyze/history (timeline)
    +--> /api/analyze/heatmap (risk hotspots, safety zones)
    +--> /api/analyze/chat (follow-up advisory)
```

---

## 6. Folder Structure Deep Dive

## Root-level (important)

- `start-all.ps1`: launches Python AI, Node backend, and Next.js frontend
- `AUTHENTICATION_SETUP.md` and `README_AUTH.md`: auth and integration notes
- `artifacts/`, `reports/`: shared outputs/log folders

## AI model and inference

- `1st-ai-test/app.py`: FastAPI app and prediction pipeline
- `1st-ai-test/nvidia_client.py`: recommendation and image-understanding client logic
- `1st-ai-test/train.py`: model training script (PyTorch)
- `1st-ai-test/evaluate.py`: evaluation script
- `1st-ai-test/config.py`: thresholds, categories, crop constants
- `1st-ai-test/model_utils.py`: model builders and transforms
- `1st-ai-test/data_utils.py`: split/sampler utilities

## Full-stack app

- `hackathon/src/app/page.tsx`: integrated frontend workflow
- `hackathon/backend/src/controllers/analyze.controller.ts`: analysis orchestration, history, heatmap, chat
- `hackathon/backend/src/controllers/auth.controller.ts`: registration/login
- `hackathon/backend/src/controllers/livekit.controller.ts`: voice token and TTS
- `hackathon/backend/src/models/AnalysisHistory.ts`: persistence schema for analysis records

## UI prototype app

- `demogo/src/pages/`: farmer-facing screens
- `demogo/src/services/api.js`: API client helpers
- `demogo/src/components/`: navigation/sidebar/map components

## Data/training support

- `training/`, `archive/`, `data/`: dataset and experiments
- `colab/`: Google Colab-oriented copies and setup guides

---

## 7. ML Details

## Current classifier scope

- 18 disease classes (Apple/Grape/Tomato set from PlantVillage-style labeling)
- Input size: 224 x 224
- Architectures supported in training code:
  - EfficientNet-B0 (default)
  - ResNet50

## Training features in code

- Transfer learning with freeze -> fine-tune phases
- Stratified splits and weighted sampling
- Class-weighted loss
- Macro precision/recall/F1 evaluation support

## Runtime guardrails

- Blur threshold check
- Confidence threshold check (default 0.60)
- Recapture guidance when low quality/low confidence
- Fallback AI route for out-of-dataset or low-confidence scenarios

Important status note:

- Model artifacts are present in `1st-ai-test/artifacts/`
- `1st-ai-test/reports/` is currently empty in this snapshot, so final numeric benchmark screenshots should be regenerated before final judging if required.

---

## 8. LLM and Recommendation Layer

The system generates practical recommendation blocks with fields such as:

- Summary
- Immediate actions
- Organic treatment
- Chemical treatment
- Recovery estimate
- Preventive measures
- Monitoring checklist
- Safety note

Model/provider routing in code:

- Python service: NVIDIA chat API + Gemini vision fallback paths
- Node service: provider preference via config (`gemini` or NVIDIA-compatible)
- Fallback recommendation logic exists for resilience

---

## 9. Security, Privacy, and Safety

Implemented safeguards include:

- JWT authentication for protected API routes
- Password hashing with bcrypt
- Rate limiting on `/api/*`
- Helmet and CORS middleware
- Input validation with schema checks
- Confidence-gated guidance to reduce unsafe over-trust

Data handling highlights:

- Analysis history stores diagnosis metadata and image previews for user timelines and heatmap analytics
- Location data is optional and can also be extracted from EXIF if present

---

## 10. Farmer Awareness Messaging (How to Explain to Farmers)

Use this communication style during village demos:

### Short awareness message

"Do not spray blindly. First scan the leaf. If the result confidence is low, take a clearer photo and confirm before chemical action."

### Practical farmer steps

1. Take photo in daylight, one leaf clearly visible
2. Upload and wait for result
3. Read immediate actions first
4. Start with safe and preventive actions
5. Use chemical recommendation only after label/local guidance confirmation
6. Re-scan after 2 to 3 days for severe cases

### What to avoid

- Blurry photos
- Random pesticide mixing
- Ignoring protective gear during spraying

### Awareness outcome

- Better early detection habits
- Safer spray behavior
- Reduced panic and misinformation in outbreak situations

---

## 11. Existing System vs AgriVision

| Dimension | Typical Existing Practice | AgriVision Approach |
|---|---|---|
| Detection | Manual visual guess | AI-assisted image diagnosis |
| Speed | Slow, depends on visit | Near real-time API response |
| Consistency | Expert-dependent | Structured pipeline and thresholds |
| Advice Quality | Generic/verbal | Structured treatment sections |
| Traceability | Weak or paper notes | Digital history and heatmap signals |
| Safety | Risk of blind spraying | Confidence gate + recapture guidance |

---

## 12. Demo Flow for Judges

## 3-minute quick demo

1. Register/login user
2. Upload diseased leaf image
3. Show diagnosis + confidence + severity
4. Show AI recommendation sections
5. Open history and heatmap view

## 8-10 minute full demo

1. Problem context (manual delays, inconsistent diagnosis)
2. Architecture walk-through (frontend -> Node -> Python -> LLM)
3. Live upload with good image
4. Show low-quality/low-confidence behavior (guardrail path)
5. Show historical trace and map risk patterns
6. Show voice/chat advisory capability
7. Explain impact, limitations, and roadmap

---

## 13. Setup and Run (Local)

## Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB (local or cloud URI)
- API keys for LLM providers (as configured)

## Recommended full-stack startup

Use:

- `start-all.ps1`

or run manually:

1. Python AI service
   - folder: `1st-ai-test/`
   - command: `uvicorn app:app --reload --port 8001`
2. Node backend
   - folder: `hackathon/backend/`
   - command: `npm run dev`
3. Next frontend
   - folder: `hackathon/`
   - command: `npm run dev`

Access:

- Next frontend: `http://localhost:3000`
- Node health: `http://localhost:8000/api/health`
- Python health: `http://localhost:8001/health`

---

## 14. API Keys Used (What and Why)

Important: Never commit real keys to GitHub. Keep them only in local `.env` files.

### Core keys used in the current integrated demo

| Environment Variable | Used In | Why It Is Needed |
|---|---|---|
| `NVIDIA_API_KEY` | Python AI service and Node backend LLM service | Authenticates calls to NVIDIA-hosted LLM APIs for treatment recommendations and advisory responses |
| `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2` | Python AI service and Node backend | Fallback/alternative LLM and vision reasoning, improves reliability when one provider is unavailable |
| `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Node backend voice controller | Generates secure room tokens for real-time live voice sessions |
| `ELEVENLABS_API_KEY` | Node backend voice controller | Converts AI text response into multilingual speech audio |
| `JWT_SECRET` | Node backend auth middleware | Signs and verifies login tokens to protect user routes |
| `MONGODB_URI` | Node backend DB connection | Connects to MongoDB for user accounts, analysis history, and heatmap data source |

### Provider and model configuration variables (not secrets but important)

| Environment Variable | Used In | Why It Is Needed |
|---|---|---|
| `NVIDIA_MODEL` / `LLM_MODEL` | Python AI service and Node backend | Selects model quality/speed tradeoff for recommendations |
| `NVIDIA_API_BASE_URL` | Python AI service | Lets the app target compatible NVIDIA API endpoint |
| `GEMINI_MODEL` | Python and Node | Selects Gemini model variant used for fallback reasoning |
| `LLM_PROVIDER` | Node backend | Chooses which provider path to prefer at runtime |
| `ML_SERVICE_URL` | Node backend | Points backend to Python inference service endpoint |
| `VITE_BACKEND_URL` | React Vite frontend | Makes frontend talk to correct backend URL |

### Optional keys present in config/templates

| Environment Variable | Current Status | Why It Exists |
|---|---|---|
| `DEEPGRAM_API_KEY` | Configured placeholder (not critical in current path) | Reserved for speech-to-text/voice expansion workflows |
| `OPENWEATHER_API_KEY` | Optional placeholder | Future weather-aware advisory enrichment |
| `GROQ_API_KEY` | Optional placeholder | Future/backup LLM provider support |

Judge explanation (one line):

"We use keys only for secure access to external AI and voice services, while core disease inference stays in our own backend pipeline."

---

## 15. Technologies Used (What and Why)

### AI and ML layer

| Technology | Where Used | Why Chosen |
|---|---|---|
| PyTorch + Torchvision | `1st-ai-test/` training and inference | Strong transfer-learning ecosystem and reliable model development workflow |
| EfficientNet-B0 / ResNet50 | `train.py`, `model_utils.py` | Good accuracy vs compute balance for crop disease classification |
| OpenCV + Pillow | image pipeline in Python | Practical image handling and blur-quality checks before prediction |
| scikit-learn | evaluation scripts | Standard macro precision/recall/F1 metrics for judge-friendly reporting |
| KaggleHub | dataset workflow | Fast and reproducible dataset fetching for training |

### Backend and API layer

| Technology | Where Used | Why Chosen |
|---|---|---|
| Node.js + Express | `hackathon/backend/` | Lightweight, fast API gateway and orchestration layer |
| TypeScript | backend source code | Improves maintainability and reduces runtime mistakes |
| MongoDB + Mongoose | auth/history/heatmap persistence | Flexible schema for evolving analysis and recommendation objects |
| JWT + bcrypt | authentication | Industry-standard session security and password hashing |
| Helmet + CORS + rate limiter | API middleware | Security hardening and abuse protection |

### Frontend and user experience layer

| Technology | Where Used | Why Chosen |
|---|---|---|
| Next.js (React) | `hackathon/` | Unified modern web app for integrated demo flow |
| React + Vite | `demogo/` | Fast UI iteration for farmer-centric design prototypes |
| Tailwind CSS | frontend styling | Rapid, responsive UI development under hackathon timelines |
| Leaflet / React Leaflet / leaflet.heat | map and hotspot visuals | Clear geospatial communication of disease spread and risk zones |

### Voice and AI advisory layer

| Technology | Where Used | Why Chosen |
|---|---|---|
| LiveKit | voice session token and room flow | Real-time interactive voice capability for low-literacy-friendly access |
| ElevenLabs | TTS endpoint | High-quality multilingual voice output for farmer guidance |
| NVIDIA and Gemini APIs | advisory logic | Balanced approach: strong recommendation quality with fallback resilience |

Judge explanation (one line):

"Each technology was selected for practical field impact: accurate diagnosis, safe decision support, reliable APIs, and easy farmer interaction."

---

## 16. API Surface (High-Level)

## Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

## Analysis

- `POST /api/analyze/upload` (multipart image, protected)
- `GET /api/analyze/history` (protected)
- `GET /api/analyze/heatmap` (protected)
- `POST /api/analyze/chat` (protected)

## Metadata

- `GET /api/health`
- `GET /api/crops`
- `GET /api/diseases`

## Voice

- `POST /api/livekit/token` (protected)
- `POST /api/livekit/tts` (protected)

---

## 17. Current Status (Transparent)

### Strongly implemented

- Multi-service architecture
- Auth and protected API flow
- Image upload analysis pipeline
- External Python AI delegation mode
- History + heatmap analytics backend
- Voice service endpoints

### In-progress / mixed readiness

- Multiple frontend tracks exist (Next.js integrated + React prototype)
- Some UI flows in prototype are partially mocked
- Benchmark report files need regeneration in current workspace snapshot

This transparency is intentional for Expo judging quality.

---

## 18. Limitations

- Core trained class map currently centered on Apple/Grape/Tomato disease set
- Field domain shift can affect accuracy (lighting/device/leaf angle variability)
- Real-world pesticide advice must follow local label and agronomy officer guidance
- Internet connectivity is needed for full AI + voice features

---

## 19. Future Roadmap

1. Expand validated crop/disease classes with region-specific datasets
2. Add stronger offline and low-bandwidth inference pathways
3. Integrate weather APIs for dynamic advisories
4. Add multilingual text/audio output parity across all UI paths
5. Add district-level outbreak alerting and admin dashboards
6. Build periodic follow-up scoring for treatment effectiveness

---

## 20. One-Minute Pitch (Ready to Speak)

"AgriVision AI is a farmer-first crop disease intelligence platform. A farmer uploads a leaf image, and the system checks image quality, predicts disease with confidence, and gives immediate treatment guidance with safety notes. We do not blindly over-trust AI, because low-confidence and low-quality images are gated and asked for recapture. On top of diagnosis, we maintain history and heatmap-style spread visibility for local decision support. Our architecture combines computer vision, LLM recommendations, secure backend APIs, and multilingual/voice capabilities to make practical, scalable crop protection support."

---

## 21. Suggested Judge Q&A Short Answers

### Q: Is this just a chatbot?

No. Core value comes from structured visual diagnosis pipeline with quality checks, confidence gating, and persisted analysis analytics.

### Q: What if prediction is wrong?

The system has blur/quality checks, confidence thresholds, and fallback strategy. It guides recapture when confidence is low.

### Q: Is this usable by non-technical farmers?

Yes. The UI is designed around simple upload -> result -> action steps, with multilingual and voice support layers.

### Q: What is the real impact?

Earlier detection, safer interventions, reduced unnecessary spray, and better outbreak awareness.

---

## 22. Final Note for Expo

This repository reflects both core engineering implementation and product exploration tracks. For live judging, use the integrated path:

- `hackathon/` (frontend)
- `hackathon/backend/` (secure API)
- `1st-ai-test/` (AI inference engine)

This gives the most complete demonstration of real diagnosis, recommendation, history, and map-based decision support.
