# Quick Start Guide
## AgriVision - Matrix Fusion 4.0 Hackathon

---

## Phase 1: Environment Setup (30 min)

### Step 1.1: Create Project Structure
```bash
cd hackathon
# Structure already created by documentation
```

### Step 1.2: Set Up Python Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 1.3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 1.4: Configure API Keys
```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your NVIDIA API key
# Get FREE key at: https://build.nvidia.com/
# 1. Sign in/create NVIDIA account
# 2. Go to any model page (e.g., llama-3.1-70b-instruct)
# 3. Click "Get API Key"
# 4. Copy key starting with "nvapi-"
```

---

## Phase 2: Data Preparation (1-2 hours)

### Step 2.1: Download PlantVillage Dataset
```bash
# Option A: Via Kaggle API
pip install kaggle
# Upload kaggle.json to ~/.kaggle/
kaggle datasets download -d abdallahalidev/plantvillage-dataset
unzip plantvillage-dataset.zip -d data/raw/

# Option B: Manual download
# Go to: https://www.kaggle.com/datasets/abdallahalidev/plantvillage-dataset
# Download and extract to data/raw/
```

### Step 2.2: Filter Relevant Classes
```python
# Run in Python or create script
import os
import shutil

CLASSES = [
    'Apple___Apple_scab', 'Apple___Black_rot',
    'Apple___Cedar_apple_rust', 'Apple___healthy',
    'Grape___Black_rot', 'Grape___Esca_(Black_Measles)',
    'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)', 'Grape___healthy',
    'Tomato___Bacterial_spot', 'Tomato___Early_blight',
    'Tomato___Late_blight', 'Tomato___Leaf_Mold',
    'Tomato___Septoria_leaf_spot',
    'Tomato___Spider_mites Two-spotted_spider_mite',
    'Tomato___Target_Spot', 'Tomato___Tomato_Yellow_Leaf_Curl_Virus',
    'Tomato___Tomato_mosaic_virus', 'Tomato___healthy'
]

src = 'data/raw/plantvillage dataset/color'
dst = 'data/processed'
os.makedirs(dst, exist_ok=True)

for cls in CLASSES:
    if os.path.exists(f'{src}/{cls}'):
        shutil.copytree(f'{src}/{cls}', f'{dst}/{cls}')
```

---

## Phase 3: Model Training (Google Colab - 4-6 hours)

### Step 3.1: Open Google Colab
1. Go to https://colab.research.google.com
2. Create new notebook
3. Change runtime to GPU (Runtime > Change runtime type > GPU)

### Step 3.2: Training Code
```python
# See notebooks/02_model_training.ipynb
# Or copy from docs/BRAINSTORM_ML_MODEL.md
```

### Step 3.3: Download Trained Model
After training completes:
- Download `model.h5`
- Download `class_labels.json`
- Place both in `model/` folder

---

## Phase 4: Backend Development (3-4 hours)

### Step 4.1: Create FastAPI App
Create `backend/app/main.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AgriVision API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {"status": "healthy"}

# Add more routes...
```

### Step 4.2: Run Backend
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Test: http://localhost:8000/docs

---

## Phase 5: Frontend Development (3-4 hours)

### Step 5.1: Create Streamlit App
Create `streamlit_app/app.py`:
```python
import streamlit as st
import requests

st.set_page_config(page_title="AgriVision", page_icon="🌿")
st.title("🌿 AgriVision - Crop Disease Detection")

uploaded = st.file_uploader("Upload leaf image", type=['jpg', 'png'])
if uploaded:
    st.image(uploaded)
    if st.button("Analyze"):
        # Call API
        pass
```

### Step 5.2: Run Frontend
```bash
cd streamlit_app
streamlit run app.py
```

Open: http://localhost:8501

---

## Phase 6: Integration & Testing (2-3 hours)

### Checklist
- [ ] Upload image works
- [ ] Blur detection triggers warning
- [ ] CNN predicts correct class
- [ ] Confidence threshold works
- [ ] LLM generates recommendations
- [ ] UI displays all information
- [ ] Error handling works

---

## Phase 7: Documentation (1 hour)

### Deliverables
- [ ] README.md complete
- [ ] Evaluation report (confusion matrix, F1, etc.)
- [ ] LLM prompt design document
- [ ] Presentation slides (10 min pitch)

---

## Timeline Summary (24 hours)

| Phase | Duration | Hours |
|-------|----------|-------|
| Setup | 30 min | 0-0.5 |
| Data Prep | 2 hours | 0.5-2.5 |
| Model Training | 6 hours | 2.5-8.5 |
| Backend | 4 hours | 8.5-12.5 |
| Frontend | 4 hours | 12.5-16.5 |
| Integration | 3 hours | 16.5-19.5 |
| LLM Integration | 2 hours | 19.5-21.5 |
| Testing | 1.5 hours | 21.5-23 |
| Documentation | 1 hour | 23-24 |

---

## Emergency Fallbacks

### Model Training Takes Too Long
- Use MobileNetV2 (smaller, faster)
- Reduce epochs to 15
- Use smaller image size (160x160)

### LLM API Fails
- Implement fallback responses
- Cache common disease recommendations
- Use simpler prompt

### Demo Crashes
- Have backup test images ready
- Keep terminal logs visible
- Prepare offline backup plan

---

## Useful Commands

```bash
# Start everything
cd backend && uvicorn app.main:app --port 8000 &
cd streamlit_app && streamlit run app.py

# Check GPU (Colab)
!nvidia-smi

# Test API
curl http://localhost:8000/api/health

# Install single package
pip install package_name

# Freeze dependencies
pip freeze > requirements.txt
```

---

Good luck with your hackathon!
