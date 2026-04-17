# AgriVision Backend - Codebase Review & Understanding

**Last Updated:** April 2026  
**Project:** AgriVision AI - Crop Disease Detection System  
**Tech Stack:** Node.js + Express + TypeScript

---

## 📋 Executive Summary

AgriVision is a **standalone REST API backend** (not Next.js monolith) built with Express.js and TypeScript. It provides crop disease detection and treatment recommendations by combining:
- **Image processing** (blur detection, validation, format conversion)
- **ML inference** (disease classification from crop images)
- **LLM integration** (treatment recommendations via NVIDIA NIM)
- **Caching & rate limiting** (performance & security)

**Key Decision:** Pure Node.js + Express architecture allows separation from frontend and faster ML inference on the server side.

---

## 🏗️ Project Architecture

```
┌─────────────────────────────────────────────────────┐
│           AGRIVISION BACKEND API                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Express Server (Port 8000)                         │
│  ├─ Security: Helmet + CORS                         │
│  ├─ Rate Limiting: 15 min window protection         │
│  └─ Error Handling: Global middleware               │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ ROUTES & CONTROLLERS                         │  │
│  │ POST   /api/analyze       → Analyzeontroller │  │
│  │ GET    /api/health        → Health check     │  │
│  │ GET    /api/crops         → List crops       │  │
│  │ GET    /api/diseases/:id  → Disease details  │  │
│  └───────────────────────────────────────────────┘  │
│                      ↓                               │
│  ┌───────────────────────────────────────────────┐  │
│  │ SERVICES LAYER                                │  │
│  │                                               │  │
│  │ • ImageProcessor    → Validate & process img │  │
│  │ • DiseaseClassifier → ML inference (ONNX)   │  │
│  │ • LLMService        → NVIDIA NIM API calls  │  │
│  │ • LocationService   → GPS/EXIF extraction   │  │
│  │ • CacheService      → LRU cache for results │  │
│  └───────────────────────────────────────────────┘  │
│                      ↓                               │
│  ┌───────────────────────────────────────────────┐  │
│  │ EXTERNAL DEPENDENCIES                         │  │
│  │ • NVIDIA API (NIM)  → LLM recommendations   │  │
│  │ • ONNX Model        → Disease classification │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📁 Directory Structure Explanation

```
backend/
│
├── 📄 package.json              ← Dependencies & scripts
├── 📄 tsconfig.json             ← TypeScript configuration
├── .env/.env.example            ← Environment variables
│
├── src/                         ← Source code (TypeScript)
│   ├── index.ts                 ⭐ SERVER ENTRY POINT
│   │                               • Starts Express server
│   │                               • Initializes logger
│   │
│   ├── app.ts                   ⭐ EXPRESS APP SETUP
│   │                               • Middleware stack
│   │                               • Route mounting
│   │                               • Error handler
│   │
│   ├── config/
│   │   └── index.ts             • Environment variables
│   │                             • Configuration object
│   │
│   ├── routes/                  ⭐ API ROUTE DEFINITIONS
│   │   ├── index.ts             • Route aggregator
│   │   ├── analyze.routes.ts    • POST /api/analyze
│   │   ├── health.routes.ts     • GET /api/health
│   │   ├── crops.routes.ts      • GET /api/crops
│   │   └── diseases.routes.ts   • GET /api/diseases/:id
│   │
│   ├── controllers/             ⭐ REQUEST HANDLERS
│   │   ├── analyze.controller.ts → Handles image upload & analysis
│   │   ├── health.controller.ts  → Server health check
│   │   ├── crops.controller.ts   → Returns supported crops
│   │   └── diseases.controller.ts → Returns disease info
│   │
│   ├── services/                ⭐ BUSINESS LOGIC LAYER
│   │   ├── imageProcessor.ts     → blur detection, validation
│   │   ├── diseaseClassifier.ts  → ONNX model inference
│   │   ├── llmService.ts         → NVIDIA NIM API client
│   │   ├── locationService.ts    → EXIF/GPS extraction
│   │   ├── cacheService.ts       → LRU caching
│   │   └── mockDiseaseClassifier.ts → Testing fallback
│   │
│   ├── middleware/              • Error handling
│   │   ├── errorHandler.ts      • Rate limiting
│   │   ├── rateLimiter.ts       • Request validation
│   │   └── validateRequest.ts
│   │
│   ├── lib/                     • Shared constants & types
│   │   ├── constants.ts         • Disease classes, severity rules
│   │   ├── types.ts             • TypeScript interfaces
│   │   └── errors.ts            • Custom error classes
│   │
│   └── utils/
│       └── logger.ts            → Winston logger instance
│
├── model/                       ← ML Models
│   ├── model.onnx              • Disease classification model
│   └── class_labels.json       • Disease class mappings
│
├── tests/                       ← Unit & integration tests
│   ├── analyze.test.ts
│   ├── imageProcessor.test.ts
│   └── llmService.test.ts
│
└── Dockerfile                   ← Container deployment
```

---

## 🔄 Data Flow: Image to Recommendations

### POST `/api/analyze` - Complete Flow

```
1. CLIENT REQUEST
   ├─ Image (Base64 or file upload)
   ├─ Crop type (optional: 'tomato'|'apple'|'grape'|'auto')
   └─ GPS location (optional)

2. VALIDATION LAYER (validateRequest middleware)
   ├─ Check required fields
   └─ Validate schema with Zod

3. IMAGE PROCESSING
   ├─ ImageProcessor.validateImage()
   │  ├─ Check blur score
   │  ├─ Verify image format (JPG/PNG)
   │  └─ Check file size
   │
   ├─ IF blur detected → Return 400 error ❌
   │
   └─ IF valid → Proceed ✅

4. DISEASE CLASSIFICATION
   ├─ DiseaseClassifier.predict(imageBuffer)
   │  ├─ Load ONNX model (cached)
   │  ├─ Preprocess image (resize, normalize)
   │  ├─ Run inference
   │  └─ Parse confidence scores
   │
   ├─ IF confidence < threshold → Return 400 error ❌
   │
   └─ IF confident → Proceed ✅

5. LLM SERVICE (Treatment Recommendations)
   ├─ LLMService.getRecommendations()
   │  ├─ Construct prompt with:
   │  │  • Detected disease
   │  │  • Confidence score
   │  │  • Crop type
   │  │  • Location coordinates
   │  │
   │  ├─ Call NVIDIA NIM API (OpenAI SDK)
   │  └─ Parse JSON response
   │
   └─ Return structured recommendations

6. CACHING
   ├─ Hash image Base64
   ├─ Store result in LRU cache
   └─ TTL: 30 minutes

7. RESPONSE
   {
     "success": true,
     "analysis": {
       "disease": "Tomato___Late_blight",
       "confidence": 0.96,
       "severity": "high"
     },
     "recommendations": {
       "summary": "...",
       "organic": "...",
       "chemical": "...",
       "timeToRecovery": "7-10 days",
       "preventive": "...",
       "weatherAdvisory": "..."
     }
   }
```

---

## 🛠️ Key Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Node.js 20 LTS | JavaScript server runtime |
| **Framework** | Express 4.x | HTTP server & routing |
| **Language** | TypeScript 5.x | Type-safe JavaScript |
| **Validation** | Zod | Schema validation |
| **ML Inference** | ONNX Runtime Node | Disease classification |
| **LLM API** | NVIDIA NIM + OpenAI SDK | Treatment recommendations |
| **Image Processing** | sharp | Image validation, resizing |
| **Caching** | lru-cache | In-memory result caching |
| **Logging** | Winston | Structured logging |
| **Security** | Helmet | HTTP header security |
| **Rate Limiting** | express-rate-limit | API protection |
| **Testing** | Jest + supertest | Unit & integration tests |

---

## 📝 Core Services Explained

### 1️⃣ **ImageProcessor Service**
**Location:** [src/services/imageProcessor.ts](src/services/imageProcessor.ts)

```typescript
// What it does:
• Detects image blur (quality check)
• Validates image format (JPG/PNG/WebP)
• Checks file size limits
• Preprocesses image for ML (resize, normalize)

// Usage:
const processor = ImageProcessor.getInstance();
const validation = processor.validateImage(imageBuffer);
if (validation.isBlurry) throw new BlurDetectedError();
```

---

### 2️⃣ **DiseaseClassifier Service**
**Location:** [src/services/diseaseClassifier.ts](src/services/diseaseClassifier.ts)

```typescript
// What it does:
• Loads ONNX model (one-time init, cached)
• Runs ML inference on image tensor
• Returns disease prediction + confidence
• Maps raw model output to disease names

// Technologies:
- onnxruntime-node: C++ bindings for fast inference
- Model supports: Tomato, Apple, Grape diseases

// Usage:
const classifier = DiseaseClassifier.getInstance();
const result = await classifier.predict(imageBuffer);
// Returns: { disease: "Tomato___Late_blight", confidence: 0.96 }
```

---

### 3️⃣ **LLMService**
**Location:** [src/services/llmService.ts](src/services/llmService.ts)

```typescript
// What it does:
• Calls NVIDIA NIM API for treatment recommendations
• Constructs detailed prompts with disease context
• Handles model: meta/llama-3.1-70b-instruct
• Returns structured JSON recommendations

// Expects from NVIDIA:
{
  "summary": "Brief diagnosis",
  "organic": "Organic treatment steps",
  "chemical": "Chemical treatment steps",
  "timeToRecovery": "7-10 days",
  "preventive": "Future prevention measures",
  "weatherAdvisory": "Optional weather notes"
}

// Usage:
const llm = LLMService.getInstance();
const recommendations = await llm.getRecommendations({
  crop: "tomato",
  disease: "Late Blight",
  confidence: 0.96,
  location: { latitude: 28.7041, longitude: 77.1025 }
});
```

---

### 4️⃣ **CacheService**
**Location:** [src/services/cacheService.ts](src/services/cacheService.ts)

```typescript
// What it does:
• Stores ML prediction results in LRU cache
• Hashes image Base64 to create cache key
• 30-minute TTL per entry
• Max 100 cached predictions

// Benefit:
- Avoid re-processing identical images
- Reduce NVIDIA API calls
- Lower latency for repeated requests
```

---

### 5️⃣ **LocationService**
**Location:** [src/services/locationService.ts](src/services/locationService.ts)

```typescript
// What it does:
• Extracts GPS coordinates from EXIF data
• Uses exifr library to parse image metadata
• Returns latitude & longitude
• Helps provide region-specific recommendations
```

---

## 🎯 Controller Functions

### AnalyzeController
**Route:** `POST /api/analyze`  
**Endpoint:** [src/controllers/analyze.controller.ts](src/controllers/analyze.controller.ts)

**Request:**
```json
{
  "image": "base64-encoded-image-string",
  "crop": "tomato|apple|grape|auto",  // optional
  "location": {
    "latitude": 28.7041,
    "longitude": 77.1025
  }  // optional
}
```

**Response (Success):**
```json
{
  "success": true,
  "analysis": {
    "disease": "Tomato___Late_blight",
    "confidence": 0.96,
    "severity": "high"
  },
  "recommendations": {
    "summary": "Late blight detected",
    "organic": "Apply copper fungicide...",
    "chemical": "Use Mancozeb...",
    "timeToRecovery": "7-10 days",
    "preventive": "Maintain leaf dryness...",
    "weatherAdvisory": "Monitor humidity levels"
  }
}
```

---

### HealthController
**Route:** `GET /api/health`  
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-01T10:30:45Z",
  "environment": "development",
  "useMockML": false
}
```

---

### CropsController
**Route:** `GET /api/crops`  
**Response:**
```json
{
  "crops": [
    {
      "name": "Tomato",
      "diseases": ["Late_blight", "Early_blight", "Septoria_leaf_spot"]
    },
    ...
  ]
}
```

---

## 🔐 Middleware Pipeline

```
REQUEST
  ↓
helmet()              → Security headers (X-Frame-Options, CSP, etc.)
  ↓
cors()                → Cross-Origin Resource Sharing
  ↓
express.json()        → Parse JSON body (limit: 10MB)
  ↓
morgan('dev')         → Request logging
  ↓
rateLimiter           → 15-min window rate limiting (default: 100 requests)
  ↓
routes/controllers    → Business logic
  ↓
errorHandler()        → Global error handling (MUST be last)
  ↓
RESPONSE
```

---

## ⚙️ Environment Configuration

**File:** [.env.example](../.env.example)

```bash
# Server Configuration
PORT=8000
NODE_ENV=development

# NVIDIA API (Required for LLM)
NVIDIA_API_KEY=nvapi-xxx
LLM_MODEL=meta/llama-3.1-70b-instruct

# ML Service (if using Python microservice)
ML_SERVICE_URL=http://localhost:8001

# Validation Thresholds
BLUR_THRESHOLD=100          # Image blur score limit
CONFIDENCE_THRESHOLD=0.60   # Minimum prediction confidence
MAX_IMAGE_SIZE_MB=10

# Model Paths
MODEL_PATH=./model/model.onnx
CLASS_LABELS_PATH=./model/class_labels.json

# Debug/Testing
USE_MOCK_ML=false           # Use mock classifier (testing mode)
LOG_LEVEL=debug
```

---

## 🚀 Running the Application

### Development
```bash
cd backend
npm install
npm run dev

# Server available at: http://localhost:8000
# Health check: http://localhost:8000/api/health
```

### Production Build
```bash
npm run build      # Compiles TypeScript → dist/
npm start          # Runs compiled JavaScript
```

### Docker
```bash
docker build -t agrivision-api .
docker run -p 8000:8000 --env-file .env agrivision-api
```

---

## 🧪 Testing

**Test Runner:** Jest  
**Test Files:** `tests/*.test.ts`

```bash
# Run all tests
npm test

# Run with coverage report
npm test -- --coverage

# Watch mode (re-run on changes)
npm run test:watch
```

---

## 📊 Request/Response Flow Diagram

```
┌─────────────┐
│   CLIENT    │
│  (Frontend) │
└──────┬──────┘
       │
       │ POST /api/analyze
       │ + Base64 Image
       ↓
┌─────────────────────────────────┐
│    RATE LIMITER MIDDLEWARE      │ ← Block if quota exceeded
└────────────┬────────────────────┘
             │
             ↓
┌─────────────────────────────────┐
│  ANALYZE CONTROLLER             │
├─────────────────────────────────┤
│ 1. Validate request (Zod)       │
│ 2. Check cache                  │
│    ↓ Cache HIT → Return ✅      │
│    ↓ Cache MISS → Continue      │
└────────────┬────────────────────┘
             │
             ↓
┌─────────────────────────────────┐
│  IMAGE PROCESSOR                │
├─────────────────────────────────┤
│ • Blur detection                │
│ • Format validation             │
│ • Size check                    │
└────────────┬────────────────────┘
             │ (if fail → 400 error)
             ↓
┌─────────────────────────────────┐
│  DISEASE CLASSIFIER              │
├─────────────────────────────────┤
│ • Load ONNX model               │
│ • Preprocess image              │
│ • Run inference                 │
│ • Parse results                 │
└────────────┬────────────────────┘
             │ (if fail → 400 error)
             ↓
┌─────────────────────────────────┐
│  LLM SERVICE                     │
├─────────────────────────────────┤
│ • Call NVIDIA NIM API           │
│ • Get recommendations           │
│ • Parse response                │
└────────────┬────────────────────┘
             │
             ↓
┌─────────────────────────────────┐
│  CACHE SERVICE                  │
├─────────────────────────────────┤
│ • Store result (LRU, 30 min TTL)│
└────────────┬────────────────────┘
             │
             ↓
┌─────────────────────────────────┐
│  JSON RESPONSE                  │
└────────────┬────────────────────┘
             │
             ↓
         ┌─────┐
         │CLIENT│
         └─────┘
```

---

## 🎓 Type System (`lib/types.ts`)

```typescript
interface PredictionResult {
  disease: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  topMatches: { disease: string; confidence: number }[];
}

interface Recommendations {
  summary: string;
  organic: string;
  chemical: string;
  timeToRecovery: string;
  preventive: string;
  weatherAdvisory?: string;
}

interface AnalysisResult {
  success: boolean;
  analysis: PredictionResult;
  recommendations: Recommendations;
  timestamp: string;
}

type CropType = 'tomato' | 'apple' | 'grape' | 'auto';
```

---

## ⚠️ Error Handling

**File:** [src/lib/errors.ts](src/lib/errors.ts)

```typescript
// Custom error classes for specific scenarios:

AppError                  → Base error with HTTP status code
BlurDetectedError         → Image is too blurry
LowConfidenceError        → Prediction confidence below threshold
LLMServiceError           → NVIDIA API call failed

// All errors caught by global errorHandler middleware
// Responses include: { error: "message", statusCode: xxx, timestamp: xxx }
```

---

## 🔗 Integration Points

### 1. **NVIDIA NIM API**
- **Purpose:** LLM recommendations
- **Model:** meta/llama-3.1-70b-instruct
- **Auth:** API key via .env
- **Usage:** Called after disease classification succeeds

### 2. **ONNX Model**
- **Purpose:** Disease classification
- **Format:** ONNX (Open Neural Network Exchange)
- **Location:** `./model/model.onnx`
- **Usage:** Inference engine for crop disease detection

### 3. **Frontend Integration**
- **Endpoint:** `POST http://localhost:8000/api/analyze`
- **Method:** Express REST API
- **Format:** JSON + Base64 image in request body

---

## 🚦 Status Check

| Component | Status | Notes |
|-----------|--------|-------|
| Express server | ✅ | Running on configured port |
| Routes | ✅ | All 4 main routes defined |
| Controllers | ✅ | Handlers for analyze/health/crops/diseases |
| Services | ✅ | Image, Disease, LLM, Location, Cache |
| Middleware | ✅ | Security, rate limiting, error handling |
| ONNX model | ⏳ | Needs to be added to `./model/model.onnx` |
| NVIDIA API | ⏳ | Requires API key setup |
| Tests | 📋 | Test files created, need implementation |

---

## 📋 Next Steps

### Immediate Tasks
1. ✅ Define backend routes and controllers
2. ✅ Setup middleware pipeline
3. ⏳ **Add ONNX ML model** to `./model/` directory
4. ⏳ **Configure NVIDIA NIM API** credentials
5. ⏳ **Test endpoints** with sample images
6. ⏳ **Write integration tests**
7. ⏳ **Deploy** to cloud/server

### Future Enhancements
- [ ] Add WebSocket support for real-time predictions
- [ ] Implement multi-image batch processing
- [ ] Add database for prediction history (MongoDB/PostgreSQL)
- [ ] Create admin dashboard for analytics
- [ ] Setup CI/CD pipeline (GitHub Actions)
- [ ] Add Docker Compose for local development
- [ ] Implement API authentication (JWT)
- [ ] Add request analytics/monitoring

---

## 📞 API Endpoints Summary

```
GET    /api/health                    → Server status
POST   /api/analyze                   → Disease detection + recommendations
GET    /api/crops                     → List supported crops
GET    /api/diseases/:id              → Disease details
```

---

## 🎯 Key Takeaways

1. **Architecture:** Clean separation - Express API ↔ ML Services ↔ External APIs
2. **Services:** Modular design with single-responsibility principle
3. **Performance:** Caching, rate limiting, efficient ONNX inference
4. **Security:** Helmet, CORS, rate limiting, input validation
5. **Type Safety:** Full TypeScript for maintainability
6. **Scalability:** Middleware-based, easy to add features
7. **Testing:** Jest setup ready for comprehensive tests

---

**Generated:** April 1, 2026  
**For:** First Code Review  
**Status:** Ready for team review and integration
