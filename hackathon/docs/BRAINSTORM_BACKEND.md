# Backend Brainstorm Document
## AgriVision - API & Server Architecture

---

## 1. Technology Stack Options

### Option A: Next.js (Recommended for Unified Stack)
**See:** [BRAINSTORM_BACKEND_NEXTJS.md](./BRAINSTORM_BACKEND_NEXTJS.md)

**Pros:**
- Unified TypeScript codebase (frontend + backend)
- Built-in API routes
- Easy deployment (Vercel or local)
- React frontend included
- Hot reload, great DX

**Cons:**
- ML inference needs ONNX.js or Python microservice

### Option B: FastAPI (Python - Best for ML)
**Pros:**
- Async support for concurrent requests
- Auto-generated OpenAPI docs
- Built-in validation with Pydantic
- Modern Python, great for ML integration
- Fast performance

**Cons:**
- Slightly steeper learning curve

### Option B: Flask
**Pros:**
- Simple, familiar
- Large ecosystem
- Easy to get started

**Cons:**
- Sync by default (slower)
- Manual validation needed

### Option C: Streamlit (All-in-One)
**Pros:**
- No separate backend needed
- Python only
- Fastest to implement

**Cons:**
- Limited API capabilities
- Hard to separate concerns

### RECOMMENDATION: FastAPI for clean architecture, Streamlit for rapid MVP

---

## 2. Architecture Patterns

### 2.1 Monolithic (Recommended for Hackathon)
```
┌─────────────────────────────────────────────────┐
│                  FastAPI Server                  │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │              API Routes                   │   │
│  │   /api/analyze  /api/health  /api/crops   │   │
│  └──────────────────────────────────────────┘   │
│                      │                          │
│  ┌──────────┬────────┴────────┬─────────────┐  │
│  │ Image    │ Disease         │ LLM         │  │
│  │ Processor│ Classifier      │ Service     │  │
│  │          │ (CNN Model)     │ (Groq API)  │  │
│  └──────────┴─────────────────┴─────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 2.2 Service-Oriented (Production)
```
┌───────────┐     ┌─────────────┐     ┌───────────┐
│  Frontend │────▶│   API       │────▶│ ML Service│
│  (React)  │     │  Gateway    │     │ (Inference)│
└───────────┘     └──────┬──────┘     └───────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │ LLM Service │
                  │ (Groq API)  │
                  └─────────────┘
```

---

## 3. API Endpoint Design

### 3.1 Core Endpoints

#### POST /api/analyze
```json
// Request
{
  "image": "base64_encoded_string",
  "crop_type": "tomato",  // optional, auto-detect if null
  "location": {
    "latitude": 12.9141,
    "longitude": 74.8560
  }
}

// Response
{
  "success": true,
  "prediction": {
    "disease": "Tomato_Early_blight",
    "disease_display": "Early Blight",
    "confidence": 0.94,
    "severity": "moderate",
    "crop_type": "tomato"
  },
  "validation": {
    "blur_score": 245.6,
    "is_blurry": false,
    "confidence_acceptable": true
  },
  "location": {
    "latitude": 12.9141,
    "longitude": 74.8560,
    "region": "Mangalore, Karnataka",
    "climate_zone": "Tropical"
  },
  "recommendations": {
    "summary": "Early Blight detected with high confidence...",
    "immediate_actions": [...],
    "organic_treatment": [...],
    "chemical_treatment": [...],
    "recovery_time": "14-21 days",
    "preventive_measures": [...],
    "weather_advisory": "..."
  },
  "metadata": {
    "model_version": "1.0.0",
    "inference_time_ms": 1250,
    "timestamp": "2026-04-01T10:30:00Z"
  }
}
```

#### GET /api/health
```json
// Response
{
  "status": "healthy",
  "model_loaded": true,
  "llm_available": true,
  "version": "1.0.0"
}
```

#### GET /api/crops
```json
// Response
{
  "crops": [
    {
      "id": "tomato",
      "name": "Tomato",
      "icon": "🍅",
      "diseases": ["Early Blight", "Late Blight", ...]
    },
    {
      "id": "apple",
      "name": "Apple",
      "icon": "🍎",
      "diseases": ["Apple Scab", "Black Rot", ...]
    },
    {
      "id": "grape",
      "name": "Grape",
      "icon": "🍇",
      "diseases": ["Black Rot", "Esca", ...]
    }
  ]
}
```

#### GET /api/diseases/{disease_id}
```json
// Response
{
  "id": "tomato_early_blight",
  "name": "Early Blight",
  "crop": "tomato",
  "scientific_name": "Alternaria solani",
  "description": "...",
  "symptoms": [...],
  "causes": [...],
  "common_treatments": [...]
}
```

---

## 4. Module Architecture

### 4.1 Directory Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                # FastAPI app entry
│   ├── config.py              # Environment settings
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── analyze.py         # /api/analyze endpoint
│   │   ├── crops.py           # /api/crops endpoint
│   │   └── health.py          # /api/health endpoint
│   ├── services/
│   │   ├── __init__.py
│   │   ├── image_processor.py # Preprocessing & validation
│   │   ├── disease_classifier.py  # CNN inference
│   │   ├── llm_service.py     # Groq API integration
│   │   └── location_service.py    # GPS parsing
│   ├── models/
│   │   ├── __init__.py
│   │   ├── requests.py        # Pydantic request models
│   │   └── responses.py       # Pydantic response models
│   └── utils/
│       ├── __init__.py
│       ├── blur_detector.py   # Laplacian variance
│       └── exif_parser.py     # GPS extraction
├── model/
│   ├── model.h5               # Saved model weights
│   ├── model_config.json      # Architecture config
│   └── class_labels.json      # Disease class mapping
├── tests/
│   ├── test_analyze.py
│   └── test_image_processor.py
├── requirements.txt
└── README.md
```

### 4.2 Service Classes

#### ImageProcessor Service
```python
class ImageProcessor:
    def __init__(self, target_size=(224, 224)):
        self.target_size = target_size

    def load_image(self, base64_string: str) -> np.ndarray:
        """Decode base64 to numpy array"""
        pass

    def preprocess(self, image: np.ndarray) -> np.ndarray:
        """Resize, normalize, batch dimension"""
        pass

    def detect_blur(self, image: np.ndarray) -> tuple[float, bool]:
        """Laplacian variance blur detection"""
        pass

    def extract_gps(self, base64_string: str) -> dict:
        """Extract GPS from EXIF data"""
        pass

    def validate_image(self, base64_string: str) -> dict:
        """Full validation pipeline"""
        pass
```

#### DiseaseClassifier Service
```python
class DiseaseClassifier:
    def __init__(self, model_path: str):
        self.model = None
        self.class_labels = {}
        self.load_model(model_path)

    def load_model(self, path: str) -> None:
        """Load TensorFlow/PyTorch model"""
        pass

    def predict(self, image: np.ndarray) -> dict:
        """Run inference, return class + confidence"""
        pass

    def get_severity(self, confidence: float, disease: str) -> str:
        """Determine severity level"""
        pass

    def get_crop_type(self, disease: str) -> str:
        """Extract crop from disease class name"""
        pass
```

#### LLMService
```python
class LLMService:
    def __init__(self, api_key: str):
        self.client = Groq(api_key=api_key)
        self.model = "llama3-70b-8192"

    def generate_recommendations(
        self,
        crop: str,
        disease: str,
        severity: str,
        location: dict
    ) -> dict:
        """Generate context-aware recommendations"""
        pass

    def build_prompt(self, context: dict) -> str:
        """Construct prompt with all context variables"""
        pass

    def parse_response(self, response: str) -> dict:
        """Parse LLM output into structured format"""
        pass
```

---

## 5. Image Processing Pipeline

### 5.1 Validation Flow
```
Input Image (Base64)
       │
       ▼
┌─────────────────┐
│ Decode Base64   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ File Type Check │────▶│ Error: Invalid   │
│ (JPEG, PNG)     │     │ file format      │
└────────┬────────┘     └──────────────────┘
         │ ✓
         ▼
┌─────────────────┐     ┌──────────────────┐
│ File Size Check │────▶│ Error: File too  │
│ (< 10MB)        │     │ large            │
└────────┬────────┘     └──────────────────┘
         │ ✓
         ▼
┌─────────────────┐     ┌──────────────────┐
│ Blur Detection  │────▶│ Warning: Image   │
│ (Laplacian)     │     │ too blurry       │
└────────┬────────┘     └──────────────────┘
         │ ✓
         ▼
┌─────────────────┐
│ Extract GPS     │
│ (EXIF metadata) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Resize & Norm   │
│ (224x224, 0-1)  │
└────────┬────────┘
         │
         ▼
   Ready for CNN
```

### 5.2 Blur Detection Algorithm
```python
import cv2
import numpy as np

def detect_blur(image: np.ndarray, threshold: float = 100.0) -> tuple:
    """
    Detect blur using Laplacian variance.

    Args:
        image: BGR image array
        threshold: Variance threshold (default 100)

    Returns:
        (variance_score, is_blurry)
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    variance = laplacian.var()

    return variance, variance < threshold
```

### 5.3 GPS Extraction
```python
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

def extract_gps(image_bytes: bytes) -> dict:
    """Extract GPS coordinates from EXIF data."""
    img = Image.open(io.BytesIO(image_bytes))
    exif = img._getexif()

    if not exif:
        return None

    gps_info = {}
    for tag_id, value in exif.items():
        tag = TAGS.get(tag_id, tag_id)
        if tag == "GPSInfo":
            for key in value:
                gps_tag = GPSTAGS.get(key, key)
                gps_info[gps_tag] = value[key]

    # Convert to decimal degrees
    lat = convert_to_degrees(gps_info.get('GPSLatitude'))
    lon = convert_to_degrees(gps_info.get('GPSLongitude'))

    return {"latitude": lat, "longitude": lon}
```

---

## 6. CNN Inference Pipeline

### 6.1 Model Loading Strategy
```python
import tensorflow as tf
import json

class ModelManager:
    _instance = None
    _model = None

    @classmethod
    def get_instance(cls):
        """Singleton pattern for model loading"""
        if cls._instance is None:
            cls._instance = cls()
            cls._load_model()
        return cls._instance

    @classmethod
    def _load_model(cls):
        """Load model once at startup"""
        cls._model = tf.keras.models.load_model('model/model.h5')
        with open('model/class_labels.json', 'r') as f:
            cls._class_labels = json.load(f)
```

### 6.2 Inference Function
```python
def predict_disease(image: np.ndarray) -> dict:
    """
    Run CNN inference on preprocessed image.

    Args:
        image: Preprocessed numpy array (1, 224, 224, 3)

    Returns:
        {
            "class_id": int,
            "class_name": str,
            "confidence": float,
            "all_probabilities": dict
        }
    """
    model = ModelManager.get_instance()._model
    labels = ModelManager.get_instance()._class_labels

    predictions = model.predict(image)
    class_id = np.argmax(predictions[0])
    confidence = float(predictions[0][class_id])

    # Get top 3 predictions
    top_3_idx = np.argsort(predictions[0])[-3:][::-1]
    top_3 = {labels[i]: float(predictions[0][i]) for i in top_3_idx}

    return {
        "class_id": int(class_id),
        "class_name": labels[class_id],
        "confidence": confidence,
        "top_predictions": top_3
    }
```

### 6.3 Confidence Handling
```python
def process_prediction(prediction: dict) -> dict:
    """
    Process prediction with confidence gating.

    Rules:
    - confidence >= 0.80: High confidence, show result
    - 0.60 <= confidence < 0.80: Medium confidence, show with warning
    - confidence < 0.60: Low confidence, request re-upload
    """
    confidence = prediction['confidence']

    if confidence >= 0.80:
        status = "high"
        message = None
    elif confidence >= 0.60:
        status = "medium"
        message = "Result has moderate confidence. Consider uploading another image."
    else:
        status = "low"
        message = "Confidence too low for reliable diagnosis. Please upload a clearer image."

    return {
        **prediction,
        "confidence_status": status,
        "confidence_message": message,
        "should_show_result": confidence >= 0.60
    }
```

---

## 7. Severity Determination

### 7.1 Severity Matrix
```python
SEVERITY_RULES = {
    # Disease-specific severity based on confidence and disease type
    "critical_diseases": [
        "Late_blight",
        "Esca_(Black_Measles)",
        "Tomato_Yellow_Leaf_Curl_Virus"
    ],
    "thresholds": {
        "critical": 0.95,
        "high": 0.85,
        "moderate": 0.70,
        "low": 0.60
    }
}

def determine_severity(disease: str, confidence: float) -> str:
    """
    Determine severity level based on disease type and confidence.
    """
    if "healthy" in disease.lower():
        return "none"

    is_critical_disease = any(
        d in disease for d in SEVERITY_RULES["critical_diseases"]
    )

    # Critical diseases are treated more seriously
    if is_critical_disease:
        if confidence >= 0.85:
            return "critical"
        elif confidence >= 0.70:
            return "high"
        else:
            return "moderate"

    # Standard diseases
    if confidence >= 0.95:
        return "high"
    elif confidence >= 0.80:
        return "moderate"
    else:
        return "low"
```

---

## 8. Error Handling

### 8.1 Custom Exceptions
```python
class AgriVisionException(Exception):
    """Base exception for AgriVision"""
    pass

class ImageValidationError(AgriVisionException):
    """Raised when image validation fails"""
    def __init__(self, message: str, error_code: str):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)

class BlurDetectedError(ImageValidationError):
    """Raised when image is too blurry"""
    def __init__(self, blur_score: float):
        super().__init__(
            message="Image is too blurry. Please capture a clearer photo.",
            error_code="BLUR_DETECTED"
        )
        self.blur_score = blur_score

class LowConfidenceError(AgriVisionException):
    """Raised when prediction confidence is below threshold"""
    pass

class LLMServiceError(AgriVisionException):
    """Raised when LLM service fails"""
    pass
```

### 8.2 Error Response Format
```python
from fastapi import HTTPException
from fastapi.responses import JSONResponse

@app.exception_handler(ImageValidationError)
async def image_validation_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": getattr(exc, 'details', None)
            }
        }
    )
```

---

## 9. Performance Optimization

### 9.1 Model Optimization
```python
# Option 1: Convert to TFLite for faster inference
converter = tf.lite.TFLiteConverter.from_keras_model(model)
tflite_model = converter.convert()

# Option 2: Use ONNX Runtime
import onnxruntime as ort
session = ort.InferenceSession("model.onnx")

# Option 3: Quantization
converter.optimizations = [tf.lite.Optimize.DEFAULT]
quantized_model = converter.convert()
```

### 9.2 Caching
```python
from functools import lru_cache
import hashlib

@lru_cache(maxsize=100)
def get_cached_prediction(image_hash: str):
    """Cache predictions for identical images"""
    return predictions_cache.get(image_hash)

def hash_image(image_bytes: bytes) -> str:
    """Generate hash for caching"""
    return hashlib.md5(image_bytes).hexdigest()
```

### 9.3 Async Processing
```python
from fastapi import BackgroundTasks

@app.post("/api/analyze")
async def analyze_image(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks
):
    # Run inference
    result = await run_inference(request.image)

    # Log analytics in background
    background_tasks.add_task(log_analysis, result)

    return result
```

---

## 10. Configuration Management

### 10.1 Environment Variables
```python
# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App settings
    APP_NAME: str = "AgriVision"
    DEBUG: bool = False

    # Model settings
    MODEL_PATH: str = "model/model.h5"
    CLASS_LABELS_PATH: str = "model/class_labels.json"

    # Validation settings
    BLUR_THRESHOLD: float = 100.0
    CONFIDENCE_THRESHOLD: float = 0.60
    MAX_IMAGE_SIZE_MB: int = 10

    # LLM settings
    GROQ_API_KEY: str
    LLM_MODEL: str = "llama3-70b-8192"

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    class Config:
        env_file = ".env"

settings = Settings()
```

### 10.2 .env Template
```bash
# .env.example
GROQ_API_KEY=your_groq_api_key_here
DEBUG=true
BLUR_THRESHOLD=100.0
CONFIDENCE_THRESHOLD=0.60
```

---

## 11. Testing Strategy

### 11.1 Unit Tests
```python
# test_image_processor.py
import pytest
from app.services.image_processor import ImageProcessor

def test_blur_detection_sharp():
    processor = ImageProcessor()
    sharp_image = load_test_image("sharp_leaf.jpg")
    variance, is_blurry = processor.detect_blur(sharp_image)
    assert not is_blurry
    assert variance > 100

def test_blur_detection_blurry():
    processor = ImageProcessor()
    blur_image = load_test_image("blurry_leaf.jpg")
    variance, is_blurry = processor.detect_blur(blur_image)
    assert is_blurry
    assert variance < 100

def test_preprocess_dimensions():
    processor = ImageProcessor(target_size=(224, 224))
    image = load_test_image("random_size.jpg")
    processed = processor.preprocess(image)
    assert processed.shape == (1, 224, 224, 3)
```

### 11.2 Integration Tests
```python
# test_analyze.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_analyze_endpoint():
    with open("test_images/tomato_early_blight.jpg", "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode()

    response = client.post("/api/analyze", json={
        "image": image_b64,
        "crop_type": "tomato"
    })

    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    assert "prediction" in data
    assert "recommendations" in data
```

---

## 12. Deployment Checklist

### Local Development
- [ ] Python 3.9+ installed
- [ ] Virtual environment created
- [ ] Dependencies installed (requirements.txt)
- [ ] Environment variables configured (.env)
- [ ] Model files downloaded
- [ ] Run: `uvicorn app.main:app --reload`

### Production Readiness
- [ ] Model loads under 30 seconds
- [ ] All endpoints tested
- [ ] Error handling complete
- [ ] CORS configured
- [ ] Logging enabled
- [ ] Health check endpoint working

---

*Backend Brainstorm Document - AgriVision Team*
