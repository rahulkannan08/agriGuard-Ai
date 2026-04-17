# Backend Brainstorm Document (Next.js)
## AgriVision - Node.js / Next.js Architecture

---

## 1. Why Next.js for This Project?

### Advantages
- **Unified Stack:** Single TypeScript codebase for frontend + backend
- **API Routes:** Built-in serverless API endpoints
- **Fast Development:** Hot reload, great DX
- **Easy Deployment:** Vercel, or local with `next start`
- **React Frontend:** Rich UI components included

### Architecture Decision

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEXT.JS APPLICATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────┐    ┌─────────────────────────────┐   │
│   │    FRONTEND         │    │    API ROUTES (Backend)     │   │
│   │    (React Pages)    │    │    /api/*                   │   │
│   │                     │    │                             │   │
│   │  - pages/index.tsx  │───▶│  - /api/analyze             │   │
│   │  - Upload Component │    │  - /api/health              │   │
│   │  - Results Display  │    │  - /api/crops               │   │
│   └─────────────────────┘    └──────────────┬──────────────┘   │
│                                             │                   │
│                              ┌──────────────┴──────────────┐   │
│                              │         SERVICES            │   │
│                              │                             │   │
│                              │  - imageProcessor.ts        │   │
│                              │  - diseaseClassifier.ts     │   │
│                              │  - llmService.ts (NVIDIA)   │   │
│                              └─────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
              ┌─────▼─────┐                 ┌───────▼───────┐
              │  NVIDIA   │                 │  ML MODEL     │
              │  NIM API  │                 │  (ONNX.js or  │
              │  (LLM)    │                 │   Python svc) │
              └───────────┘                 └───────────────┘
```

---

## 2. Project Structure

```
agrivision-nextjs/
├── package.json
├── next.config.js
├── tsconfig.json
├── .env.local                    # Environment variables
├── .env.example
│
├── public/
│   ├── favicon.ico
│   └── images/
│
├── src/
│   ├── pages/
│   │   ├── _app.tsx              # App wrapper
│   │   ├── index.tsx             # Main page (upload + results)
│   │   └── api/
│   │       ├── analyze.ts        # POST /api/analyze
│   │       ├── health.ts         # GET /api/health
│   │       └── crops.ts          # GET /api/crops
│   │
│   ├── components/
│   │   ├── Layout/
│   │   │   └── Layout.tsx
│   │   ├── ImageUpload/
│   │   │   ├── ImageUpload.tsx
│   │   │   └── DropZone.tsx
│   │   ├── CropSelector/
│   │   │   └── CropSelector.tsx
│   │   ├── Results/
│   │   │   ├── ResultsPanel.tsx
│   │   │   ├── ConfidenceMeter.tsx
│   │   │   └── SeverityBadge.tsx
│   │   └── Recommendations/
│   │       └── RecommendationPanel.tsx
│   │
│   ├── services/
│   │   ├── imageProcessor.ts     # Blur detection, validation
│   │   ├── diseaseClassifier.ts  # ML inference
│   │   ├── llmService.ts         # NVIDIA API integration
│   │   └── locationService.ts    # GPS parsing
│   │
│   ├── lib/
│   │   ├── constants.ts          # Disease classes, thresholds
│   │   ├── types.ts              # TypeScript interfaces
│   │   └── utils.ts              # Helper functions
│   │
│   └── styles/
│       ├── globals.css
│       └── Home.module.css
│
├── model/
│   ├── model.onnx                # ONNX model for JS inference
│   └── class_labels.json
│
└── python-service/               # Optional: Python ML microservice
    ├── main.py
    ├── requirements.txt
    └── Dockerfile
```

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Next.js 14 | Full-stack React framework |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Rapid UI development |
| ML Inference | ONNX Runtime Web / Python API | Disease classification |
| LLM | NVIDIA NIM API | Treatment recommendations |
| File Upload | react-dropzone | Drag-drop uploads |
| HTTP Client | fetch / axios | API calls |
| Image Processing | sharp (server) / canvas (client) | Preprocessing |

---

## 4. Package.json

```json
{
  "name": "agrivision",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.1.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "typescript": "5.3.3",

    "tailwindcss": "3.4.1",
    "autoprefixer": "10.4.17",
    "postcss": "8.4.35",

    "react-dropzone": "14.2.3",
    "axios": "1.6.7",
    "openai": "4.28.0",
    "onnxruntime-web": "1.17.0",
    "sharp": "0.33.2",
    "exifr": "7.1.3",

    "clsx": "2.1.0",
    "lucide-react": "0.330.0"
  },
  "devDependencies": {
    "@types/node": "20.11.19",
    "@types/react": "18.2.55",
    "@types/react-dom": "18.2.19",
    "eslint": "8.56.0",
    "eslint-config-next": "14.1.0"
  }
}
```

---

## 5. API Routes Implementation

### 5.1 POST /api/analyze

```typescript
// src/pages/api/analyze.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { ImageProcessor } from '@/services/imageProcessor';
import { DiseaseClassifier } from '@/services/diseaseClassifier';
import { LLMService } from '@/services/llmService';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

interface AnalyzeRequest {
  image: string;  // base64
  cropType?: 'tomato' | 'apple' | 'grape' | 'auto';
}

interface AnalyzeResponse {
  success: boolean;
  prediction?: {
    disease: string;
    diseaseName: string;
    crop: string;
    confidence: number;
    severity: string;
  };
  validation?: {
    blurScore: number;
    isBlurry: boolean;
  };
  recommendations?: {
    summary: string;
    immediateActions: string[];
    organicTreatment: string[];
    chemicalTreatment: string[];
    recoveryTime: string;
    preventiveMeasures: string[];
  };
  error?: {
    code: string;
    message: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalyzeResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST' }
    });
  }

  try {
    const { image, cropType } = req.body as AnalyzeRequest;

    // 1. Validate image
    const imageProcessor = new ImageProcessor();
    const validation = await imageProcessor.validate(image);

    if (validation.isBlurry) {
      return res.status(400).json({
        success: false,
        validation,
        error: {
          code: 'BLUR_DETECTED',
          message: 'Image is too blurry. Please capture a clearer photo.'
        }
      });
    }

    // 2. Run disease classification
    const classifier = new DiseaseClassifier();
    const prediction = await classifier.predict(image);

    // 3. Check confidence threshold
    if (prediction.confidence < 0.6) {
      return res.status(200).json({
        success: true,
        prediction,
        validation,
        error: {
          code: 'LOW_CONFIDENCE',
          message: 'Confidence too low. Consider uploading another image.'
        }
      });
    }

    // 4. Generate LLM recommendations
    const llmService = new LLMService();
    const recommendations = await llmService.getRecommendations({
      crop: prediction.crop,
      disease: prediction.diseaseName,
      confidence: prediction.confidence,
      severity: prediction.severity,
    });

    return res.status(200).json({
      success: true,
      prediction,
      validation,
      recommendations,
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during analysis.'
      }
    });
  }
}
```

### 5.2 GET /api/health

```typescript
// src/pages/api/health.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.status(200).json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      llm: !!process.env.NVIDIA_API_KEY,
      model: true,  // Check if model loaded
    }
  });
}
```

### 5.3 GET /api/crops

```typescript
// src/pages/api/crops.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { CROP_DISEASES } from '@/lib/constants';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.status(200).json({
    crops: CROP_DISEASES
  });
}
```

---

## 6. Services Implementation

### 6.1 Image Processor Service

```typescript
// src/services/imageProcessor.ts
import sharp from 'sharp';

export class ImageProcessor {
  private blurThreshold: number;

  constructor(blurThreshold = 100) {
    this.blurThreshold = blurThreshold;
  }

  async validate(base64Image: string) {
    // Remove data URL prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Get image metadata
    const metadata = await sharp(buffer).metadata();

    // Calculate blur score using Laplacian variance
    const blurScore = await this.calculateBlurScore(buffer);

    return {
      blurScore,
      isBlurry: blurScore < this.blurThreshold,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    };
  }

  private async calculateBlurScore(buffer: Buffer): Promise<number> {
    // Convert to grayscale and apply Laplacian
    const { data, info } = await sharp(buffer)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Simple variance calculation (approximation of Laplacian variance)
    const pixels = new Uint8Array(data);
    let sum = 0;
    let sumSq = 0;

    for (let i = 0; i < pixels.length; i++) {
      sum += pixels[i];
      sumSq += pixels[i] * pixels[i];
    }

    const mean = sum / pixels.length;
    const variance = (sumSq / pixels.length) - (mean * mean);

    return variance;
  }

  async preprocess(base64Image: string): Promise<Buffer> {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Resize to 224x224, normalize
    return await sharp(buffer)
      .resize(224, 224, { fit: 'cover' })
      .toFormat('png')
      .toBuffer();
  }
}
```

### 6.2 Disease Classifier Service (ONNX.js)

```typescript
// src/services/diseaseClassifier.ts
import * as ort from 'onnxruntime-web';
import { CLASS_LABELS, SEVERITY_RULES } from '@/lib/constants';

export class DiseaseClassifier {
  private session: ort.InferenceSession | null = null;
  private modelPath = '/model/model.onnx';

  async loadModel() {
    if (!this.session) {
      this.session = await ort.InferenceSession.create(this.modelPath);
    }
    return this.session;
  }

  async predict(base64Image: string) {
    const session = await this.loadModel();

    // Preprocess image to tensor
    const inputTensor = await this.imageToTensor(base64Image);

    // Run inference
    const feeds = { input: inputTensor };
    const results = await session.run(feeds);
    const output = results.output.data as Float32Array;

    // Get prediction
    const maxIndex = this.argMax(output);
    const confidence = output[maxIndex];
    const diseaseClass = CLASS_LABELS[maxIndex];

    // Parse crop and disease name
    const [crop, ...diseaseParts] = diseaseClass.split('___');
    const diseaseName = diseaseParts.join(' ').replace(/_/g, ' ');

    // Determine severity
    const severity = this.calculateSeverity(diseaseClass, confidence);

    return {
      disease: diseaseClass,
      diseaseName: diseaseName || 'Healthy',
      crop: crop.toLowerCase(),
      confidence,
      severity,
      topPredictions: this.getTopPredictions(output, 3),
    };
  }

  private async imageToTensor(base64Image: string): Promise<ort.Tensor> {
    // Implementation depends on environment (Node vs Browser)
    // This is a simplified version
    const { ImageProcessor } = await import('./imageProcessor');
    const processor = new ImageProcessor();
    const preprocessed = await processor.preprocess(base64Image);

    // Convert to float32 array normalized to [0, 1]
    const pixels = new Float32Array(224 * 224 * 3);
    for (let i = 0; i < preprocessed.length; i++) {
      pixels[i] = preprocessed[i] / 255.0;
    }

    return new ort.Tensor('float32', pixels, [1, 224, 224, 3]);
  }

  private argMax(arr: Float32Array): number {
    let maxIndex = 0;
    let maxValue = arr[0];
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] > maxValue) {
        maxValue = arr[i];
        maxIndex = i;
      }
    }
    return maxIndex;
  }

  private calculateSeverity(disease: string, confidence: number): string {
    if (disease.toLowerCase().includes('healthy')) return 'none';

    const isCritical = SEVERITY_RULES.criticalDiseases.some(d =>
      disease.toLowerCase().includes(d.toLowerCase())
    );

    if (isCritical) {
      if (confidence >= 0.85) return 'critical';
      if (confidence >= 0.70) return 'high';
      return 'moderate';
    }

    if (confidence >= 0.95) return 'high';
    if (confidence >= 0.80) return 'moderate';
    return 'low';
  }

  private getTopPredictions(output: Float32Array, n: number) {
    const indexed = Array.from(output).map((val, idx) => ({ val, idx }));
    indexed.sort((a, b) => b.val - a.val);

    return indexed.slice(0, n).map(item => ({
      disease: CLASS_LABELS[item.idx],
      confidence: item.val,
    }));
  }
}
```

### 6.3 LLM Service (NVIDIA NIM API)

```typescript
// src/services/llmService.ts
import OpenAI from 'openai';

const SYSTEM_PROMPT = `You are AgriVision AI, an expert agricultural advisor specializing in crop disease management for Indian farms. You provide practical, actionable recommendations for farmers and agronomists.

Your expertise covers:
- Tomato, Apple, and Grape crop diseases
- Organic and chemical treatment options
- Region-specific agricultural practices in India
- Seasonal and weather-based recommendations

Guidelines:
1. Always provide both organic AND chemical treatment options
2. Consider the Indian agricultural context (monsoons, local availability)
3. Include time-to-recovery estimates
4. Mention preventive measures for future
5. Be concise but comprehensive
6. Use simple language that farmers can understand

Respond in JSON format with this structure:
{
  "summary": "Brief diagnosis summary",
  "immediateActions": ["action1", "action2"],
  "organicTreatment": ["treatment1", "treatment2"],
  "chemicalTreatment": ["treatment1", "treatment2"],
  "recoveryTime": "X-Y days",
  "preventiveMeasures": ["measure1", "measure2"],
  "weatherAdvisory": "optional weather note"
}`;

interface RecommendationInput {
  crop: string;
  disease: string;
  confidence: number;
  severity: string;
  location?: {
    region?: string;
    state?: string;
  };
}

export class LLMService {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      baseURL: 'https://integrate.api.nvidia.com/v1',
      apiKey: process.env.NVIDIA_API_KEY,
    });
    this.model = process.env.LLM_MODEL || 'meta/llama-3.1-70b-instruct';
  }

  async getRecommendations(input: RecommendationInput) {
    const prompt = this.buildPrompt(input);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || '';
      return this.parseResponse(content);

    } catch (error) {
      console.error('LLM Error:', error);
      return this.getFallbackResponse(input);
    }
  }

  private buildPrompt(input: RecommendationInput): string {
    let prompt = `A ${input.crop} crop has been diagnosed with ${input.disease}.

Detection Details:
- Confidence: ${(input.confidence * 100).toFixed(1)}%
- Severity: ${input.severity}
`;

    if (input.location?.region) {
      prompt += `
Location: ${input.location.region}, ${input.location.state || 'India'}
`;
    }

    prompt += `
Please provide comprehensive treatment recommendations in JSON format.`;

    return prompt;
  }

  private parseResponse(content: string) {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse LLM response:', e);
    }

    // Return raw content if JSON parsing fails
    return {
      summary: content,
      immediateActions: [],
      organicTreatment: [],
      chemicalTreatment: [],
      recoveryTime: 'Consult expert',
      preventiveMeasures: [],
    };
  }

  private getFallbackResponse(input: RecommendationInput) {
    return {
      summary: `${input.disease} detected on ${input.crop} with ${input.severity} severity.`,
      immediateActions: [
        'Remove visibly infected plant parts',
        'Isolate affected plants',
        'Avoid overhead watering',
      ],
      organicTreatment: [
        'Apply neem oil spray (5ml/liter)',
        'Use copper-based organic fungicide',
      ],
      chemicalTreatment: [
        'Consult local agricultural extension for chemical options',
      ],
      recoveryTime: '14-21 days with treatment',
      preventiveMeasures: [
        'Practice crop rotation',
        'Improve air circulation',
        'Regular monitoring',
      ],
    };
  }
}
```

---

## 7. Constants & Types

### 7.1 Constants

```typescript
// src/lib/constants.ts
export const CLASS_LABELS: string[] = [
  'Apple___Apple_scab',
  'Apple___Black_rot',
  'Apple___Cedar_apple_rust',
  'Apple___healthy',
  'Grape___Black_rot',
  'Grape___Esca_(Black_Measles)',
  'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)',
  'Grape___healthy',
  'Tomato___Bacterial_spot',
  'Tomato___Early_blight',
  'Tomato___Late_blight',
  'Tomato___Leaf_Mold',
  'Tomato___Septoria_leaf_spot',
  'Tomato___Spider_mites Two-spotted_spider_mite',
  'Tomato___Target_Spot',
  'Tomato___Tomato_Yellow_Leaf_Curl_Virus',
  'Tomato___Tomato_mosaic_virus',
  'Tomato___healthy',
];

export const CROP_DISEASES = [
  {
    id: 'tomato',
    name: 'Tomato',
    icon: '🍅',
    diseases: [
      'Bacterial Spot', 'Early Blight', 'Late Blight',
      'Leaf Mold', 'Septoria Leaf Spot', 'Spider Mites',
      'Target Spot', 'Yellow Leaf Curl Virus', 'Mosaic Virus'
    ],
  },
  {
    id: 'apple',
    name: 'Apple',
    icon: '🍎',
    diseases: ['Apple Scab', 'Black Rot', 'Cedar Apple Rust'],
  },
  {
    id: 'grape',
    name: 'Grape',
    icon: '🍇',
    diseases: ['Black Rot', 'Esca (Black Measles)', 'Leaf Blight'],
  },
];

export const SEVERITY_RULES = {
  criticalDiseases: [
    'Late_blight',
    'Esca',
    'Tomato_Yellow_Leaf_Curl_Virus',
  ],
  thresholds: {
    critical: 0.95,
    high: 0.85,
    moderate: 0.70,
    low: 0.60,
  },
};

export const VALIDATION_CONFIG = {
  blurThreshold: 100,
  confidenceThreshold: 0.60,
  maxImageSizeMB: 10,
};
```

### 7.2 TypeScript Types

```typescript
// src/lib/types.ts
export interface PredictionResult {
  disease: string;
  diseaseName: string;
  crop: string;
  confidence: number;
  severity: 'none' | 'low' | 'moderate' | 'high' | 'critical';
  topPredictions: Array<{
    disease: string;
    confidence: number;
  }>;
}

export interface ValidationResult {
  blurScore: number;
  isBlurry: boolean;
  width?: number;
  height?: number;
  format?: string;
}

export interface Recommendations {
  summary: string;
  immediateActions: string[];
  organicTreatment: string[];
  chemicalTreatment: string[];
  recoveryTime: string;
  preventiveMeasures: string[];
  weatherAdvisory?: string;
}

export interface AnalysisResult {
  success: boolean;
  prediction?: PredictionResult;
  validation?: ValidationResult;
  recommendations?: Recommendations;
  error?: {
    code: string;
    message: string;
  };
}

export type CropType = 'tomato' | 'apple' | 'grape' | 'auto';
```

---

## 8. ML Model Options for Next.js

### Option A: ONNX Runtime Web (Client-side)
```typescript
// Browser-based inference
import * as ort from 'onnxruntime-web';

// Convert TensorFlow model to ONNX:
// python -m tf2onnx.convert --saved-model ./model --output model.onnx
```

**Pros:**
- No server-side ML dependencies
- Works offline after initial load
- Reduces server load

**Cons:**
- Larger initial download
- Limited to browser capabilities

### Option B: TensorFlow.js (Client-side)
```typescript
import * as tf from '@tensorflow/tfjs';

const model = await tf.loadLayersModel('/model/model.json');
const prediction = model.predict(tensor);
```

**Pros:**
- Native TensorFlow format
- Good documentation

**Cons:**
- Larger bundle size
- Performance varies by browser

### Option C: Python Microservice (Server-side) - RECOMMENDED
```
┌─────────────────┐      ┌──────────────────┐
│   Next.js App   │─────▶│  Python FastAPI  │
│   /api/analyze  │ HTTP │  ML Inference    │
└─────────────────┘      └──────────────────┘
```

```typescript
// src/services/diseaseClassifier.ts (calling Python service)
export class DiseaseClassifier {
  private apiUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';

  async predict(base64Image: string) {
    const response = await fetch(`${this.apiUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image }),
    });

    return response.json();
  }
}
```

Python microservice:
```python
# python-service/main.py
from fastapi import FastAPI
from pydantic import BaseModel
import tensorflow as tf

app = FastAPI()
model = tf.keras.models.load_model('model.h5')

class PredictRequest(BaseModel):
    image: str  # base64

@app.post("/predict")
async def predict(req: PredictRequest):
    # Preprocess and predict
    ...
    return {"disease": ..., "confidence": ...}
```

---

## 9. Environment Configuration

```bash
# .env.local
# NVIDIA API (Required)
NVIDIA_API_KEY=nvapi-your_key_here
LLM_MODEL=meta/llama-3.1-70b-instruct

# ML Service (if using Python microservice)
ML_SERVICE_URL=http://localhost:8001

# App Config
NEXT_PUBLIC_APP_NAME=AgriVision
BLUR_THRESHOLD=100
CONFIDENCE_THRESHOLD=0.60
```

---

## 10. Running the Application

### Development
```bash
# Install dependencies
npm install

# Start Next.js dev server
npm run dev

# (Optional) Start Python ML service
cd python-service
pip install -r requirements.txt
uvicorn main:app --port 8001
```

### Production
```bash
# Build
npm run build

# Start
npm start
```

---

## 11. Deployment Options

### Option A: Vercel (Easiest)
- Push to GitHub
- Connect to Vercel
- Auto-deploys on push

### Option B: Local/On-Premise
```bash
npm run build
npm start -- -p 3000
```

### Option C: Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 12. Quick Start Commands

```bash
# Create Next.js project
npx create-next-app@latest agrivision --typescript --tailwind --eslint

# Install dependencies
cd agrivision
npm install react-dropzone axios openai onnxruntime-web sharp exifr lucide-react

# Create directory structure
mkdir -p src/{components,services,lib,pages/api}
mkdir -p public/model

# Start development
npm run dev
```

---

*Backend Brainstorm (Next.js) - AgriVision Team*
