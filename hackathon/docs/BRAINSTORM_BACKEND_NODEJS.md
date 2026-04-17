# Backend Brainstorm Document (Node.js + Express)
## AgriVision - Pure Node.js / Express Architecture

---

## 1. Why Node.js + Express for This Project?

### Advantages
- **Lightweight & Fast:** Minimal overhead, ideal for REST APIs
- **Separation of Concerns:** Dedicated backend, decoupled from any frontend framework
- **Same Language:** JavaScript/TypeScript everywhere (frontend + backend)
- **Huge Ecosystem:** npm has packages for everything (image processing, ML inference, etc.)
- **Non-blocking I/O:** Great for concurrent API requests and external API calls (NVIDIA NIM)
- **Easy Deployment:** Works on any server, Docker, or cloud platform

### Why Not Next.js?
- The project already has separate `frontend/` and `backend/` directories
- Next.js bundles frontend + backend together — we need a standalone API server
- A pure Express backend is simpler and more flexible for a hackathon

### Architecture Decision

```
┌─────────────────────────────────────────────────────────────────┐
│               NODE.JS / EXPRESS API SERVER                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────┐    ┌─────────────────────────────┐   │
│   │    ROUTES            │    │    MIDDLEWARE               │   │
│   │                      │    │                             │   │
│   │  POST /api/analyze   │    │  - CORS                    │   │
│   │  GET  /api/health    │    │  - Error Handler            │   │
│   │  GET  /api/crops     │    │  - Request Logger            │   │
│   │  GET  /api/diseases  │    │  - Rate Limiter              │   │
│   └──────────┬───────────┘    └─────────────────────────────┘   │
│              │                                                   │
│   ┌──────────┴──────────────────────────────────────────────┐   │
│   │                     SERVICES                             │   │
│   │                                                          │   │
│   │  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │   │
│   │  │ Image        │ │ Disease      │ │ LLM            │  │   │
│   │  │ Processor    │ │ Classifier   │ │ Service        │  │   │
│   │  │ (sharp)      │ │ (ONNX/Python)│ │ (NVIDIA NIM)   │  │   │
│   │  └──────────────┘ └──────────────┘ └────────────────┘  │   │
│   │                                                          │   │
│   │  ┌──────────────┐ ┌──────────────┐                      │   │
│   │  │ Location     │ │ Cache        │                      │   │
│   │  │ Service      │ │ Service      │                      │   │
│   │  └──────────────┘ └──────────────┘                      │   │
│   └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
          ┌─────▼─────┐                 ┌───────▼───────┐
          │  NVIDIA   │                 │  ML MODEL     │
          │  NIM API  │                 │  (ONNX Runtime│
          │  (LLM)    │                 │   or Python)  │
          └───────────┘                 └───────────────┘
```

---

## 2. Project Structure

```
backend/
├── package.json
├── tsconfig.json
├── .env                          # Environment variables
├── .env.example
│
├── src/
│   ├── index.ts                  # Entry point — starts Express server
│   ├── app.ts                    # Express app setup (middleware, routes)
│   │
│   ├── config/
│   │   └── index.ts              # Environment config with dotenv
│   │
│   ├── routes/
│   │   ├── index.ts              # Route aggregator
│   │   ├── analyze.routes.ts     # POST /api/analyze
│   │   ├── health.routes.ts      # GET  /api/health
│   │   ├── crops.routes.ts       # GET  /api/crops
│   │   └── diseases.routes.ts    # GET  /api/diseases/:id
│   │
│   ├── controllers/
│   │   ├── analyze.controller.ts # Request handling logic
│   │   ├── health.controller.ts
│   │   ├── crops.controller.ts
│   │   └── diseases.controller.ts
│   │
│   ├── services/
│   │   ├── imageProcessor.ts     # Blur detection, validation (sharp)
│   │   ├── diseaseClassifier.ts  # ML inference (ONNX Runtime Node)
│   │   ├── llmService.ts         # NVIDIA NIM API integration
│   │   ├── locationService.ts    # GPS / EXIF parsing
│   │   └── cacheService.ts       # In-memory LRU cache
│   │
│   ├── middleware/
│   │   ├── errorHandler.ts       # Global error handling
│   │   ├── requestLogger.ts      # Morgan / custom logger
│   │   ├── rateLimiter.ts        # express-rate-limit
│   │   └── validateRequest.ts    # Zod / Joi validation middleware
│   │
│   ├── lib/
│   │   ├── constants.ts          # Disease classes, severity rules
│   │   ├── types.ts              # TypeScript interfaces
│   │   └── errors.ts             # Custom error classes
│   │
│   └── utils/
│       ├── logger.ts             # Winston / Pino logger
│       └── helpers.ts            # Generic helper functions
│
├── model/
│   ├── model.onnx                # ONNX model for Node.js inference
│   └── class_labels.json         # Disease class mapping
│
├── tests/
│   ├── analyze.test.ts
│   ├── imageProcessor.test.ts
│   └── llmService.test.ts
│
├── Dockerfile
└── README.md
```

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------| 
| Runtime | Node.js 20 LTS | Server runtime |
| Framework | Express.js 4.x | HTTP server & routing |
| Language | TypeScript 5.x | Type safety |
| Validation | Zod | Request/response schema validation |
| ML Inference | onnxruntime-node / Python microservice | Disease classification |
| LLM | NVIDIA NIM API (via OpenAI SDK) | Treatment recommendations |
| Image Processing | sharp | Resize, blur detection, format conversion |
| EXIF Parsing | exifr | GPS coordinate extraction |
| Logging | winston | Structured logging |
| Rate Limiting | express-rate-limit | API protection |
| Caching | lru-cache | In-memory prediction caching |
| Testing | Jest + supertest | Unit & integration tests |
| Process Manager | PM2 (production) | Clustering, auto-restart |

---

## 4. Package.json

```json
{
  "name": "agrivision-backend",
  "version": "1.0.0",
  "private": true,
  "description": "AgriVision AI - Crop Disease Detection API (Node.js + Express)",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "start:prod": "pm2 start dist/index.js -i max",
    "lint": "eslint src/",
    "test": "jest --coverage",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "express": "^4.18.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "express-rate-limit": "^7.1.5",
    "zod": "^3.22.4",

    "openai": "^4.28.0",
    "onnxruntime-node": "^1.17.0",
    "sharp": "^0.33.2",
    "exifr": "^7.1.3",

    "winston": "^3.11.0",
    "lru-cache": "^10.2.0",
    "multer": "^1.4.5-lts.1"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "tsx": "^4.7.1",
    "@types/node": "^20.11.19",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/morgan": "^1.9.9",
    "@types/multer": "^1.4.11",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^7.0.2",
    "@typescript-eslint/parser": "^7.0.2",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "@types/jest": "^29.5.12",
    "supertest": "^6.3.4",
    "@types/supertest": "^6.0.2"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 5. Core Implementation

### 5.1 Entry Point & App Setup

```typescript
// src/index.ts
import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger';

const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`🌱 AgriVision API running on http://localhost:${PORT}`);
  logger.info(`📋 Health check: http://localhost:${PORT}/api/health`);
});
```

```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { routes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

export const app = express();

// Security & parsing middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting
app.use('/api/', rateLimiter);

// Routes
app.use('/api', routes);

// Global error handler (must be last)
app.use(errorHandler);
```

### 5.2 Configuration

```typescript
// src/config/index.ts
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // NVIDIA API (LLM)
  nvidiaApiKey: process.env.NVIDIA_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'meta/llama-3.1-70b-instruct',

  // ML Service (if using Python microservice)
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8001',

  // Validation
  blurThreshold: parseFloat(process.env.BLUR_THRESHOLD || '100'),
  confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.60'),
  maxImageSizeMB: parseInt(process.env.MAX_IMAGE_SIZE_MB || '10', 10),

  // Model
  modelPath: process.env.MODEL_PATH || './model/model.onnx',
  classLabelsPath: process.env.CLASS_LABELS_PATH || './model/class_labels.json',
};
```

---

## 6. Routes & Controllers

### 6.1 Route Aggregator

```typescript
// src/routes/index.ts
import { Router } from 'express';
import analyzeRoutes from './analyze.routes';
import healthRoutes from './health.routes';
import cropsRoutes from './crops.routes';
import diseasesRoutes from './diseases.routes';

export const routes = Router();

routes.use('/analyze', analyzeRoutes);
routes.use('/health', healthRoutes);
routes.use('/crops', cropsRoutes);
routes.use('/diseases', diseasesRoutes);
```

### 6.2 POST /api/analyze

```typescript
// src/routes/analyze.routes.ts
import { Router } from 'express';
import { analyzeController } from '../controllers/analyze.controller';

const router = Router();

router.post('/', analyzeController);

export default router;
```

```typescript
// src/controllers/analyze.controller.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ImageProcessor } from '../services/imageProcessor';
import { DiseaseClassifier } from '../services/diseaseClassifier';
import { LLMService } from '../services/llmService';
import { AppError } from '../lib/errors';

// Request validation schema
const analyzeSchema = z.object({
  image: z.string().min(1, 'Image is required'),
  cropType: z.enum(['tomato', 'apple', 'grape', 'auto']).optional().default('auto'),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).optional(),
});

export async function analyzeController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // 1. Validate request body
    const parsed = analyzeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', parsed.error.message);
    }

    const { image, cropType, location } = parsed.data;

    // 2. Validate & preprocess image
    const imageProcessor = new ImageProcessor();
    const validation = await imageProcessor.validate(image);

    if (validation.isBlurry) {
      return res.status(400).json({
        success: false,
        validation,
        error: {
          code: 'BLUR_DETECTED',
          message: 'Image is too blurry. Please capture a clearer photo.',
        },
      });
    }

    // 3. Run disease classification
    const classifier = DiseaseClassifier.getInstance();
    const prediction = await classifier.predict(image);

    // 4. Check confidence threshold
    if (prediction.confidence < 0.6) {
      return res.status(200).json({
        success: true,
        prediction,
        validation,
        error: {
          code: 'LOW_CONFIDENCE',
          message: 'Confidence too low. Consider uploading another image.',
        },
      });
    }

    // 5. Generate LLM recommendations
    const llmService = new LLMService();
    const recommendations = await llmService.getRecommendations({
      crop: prediction.crop,
      disease: prediction.diseaseName,
      confidence: prediction.confidence,
      severity: prediction.severity,
      location,
    });

    // 6. Return complete result
    return res.status(200).json({
      success: true,
      prediction,
      validation,
      recommendations,
      metadata: {
        modelVersion: '1.0.0',
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    next(error);
  }
}
```

### 6.3 GET /api/health

```typescript
// src/routes/health.routes.ts
import { Router } from 'express';
import { healthController } from '../controllers/health.controller';

const router = Router();

router.get('/', healthController);

export default router;
```

```typescript
// src/controllers/health.controller.ts
import { Request, Response } from 'express';
import { config } from '../config';

export function healthController(req: Request, res: Response) {
  res.status(200).json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      llm: !!config.nvidiaApiKey,
      model: true,
    },
    environment: config.nodeEnv,
  });
}
```

### 6.4 GET /api/crops

```typescript
// src/controllers/crops.controller.ts
import { Request, Response } from 'express';
import { CROP_DISEASES } from '../lib/constants';

export function cropsController(req: Request, res: Response) {
  res.status(200).json({ crops: CROP_DISEASES });
}
```

---

## 7. Services Implementation

### 7.1 Image Processor Service

```typescript
// src/services/imageProcessor.ts
import sharp from 'sharp';
import { config } from '../config';

export class ImageProcessor {
  private blurThreshold: number;

  constructor(blurThreshold?: number) {
    this.blurThreshold = blurThreshold ?? config.blurThreshold;
  }

  async validate(base64Image: string) {
    const buffer = this.decodeBase64(base64Image);

    // Get image metadata
    const metadata = await sharp(buffer).metadata();

    // Calculate blur score using pixel variance (Laplacian approximation)
    const blurScore = await this.calculateBlurScore(buffer);

    return {
      blurScore,
      isBlurry: blurScore < this.blurThreshold,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    };
  }

  private decodeBase64(base64Image: string): Buffer {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  }

  private async calculateBlurScore(buffer: Buffer): Promise<number> {
    const { data } = await sharp(buffer)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

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
    const buffer = this.decodeBase64(base64Image);

    return await sharp(buffer)
      .resize(224, 224, { fit: 'cover' })
      .toFormat('png')
      .toBuffer();
  }
}
```

### 7.2 Disease Classifier Service (ONNX Runtime for Node.js)

```typescript
// src/services/diseaseClassifier.ts
import * as ort from 'onnxruntime-node';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { CLASS_LABELS, SEVERITY_RULES } from '../lib/constants';
import { config } from '../config';
import { ImageProcessor } from './imageProcessor';
import { logger } from '../utils/logger';

export class DiseaseClassifier {
  private static instance: DiseaseClassifier;
  private session: ort.InferenceSession | null = null;

  private constructor() {}

  // Singleton — load model once, reuse across requests
  static getInstance(): DiseaseClassifier {
    if (!DiseaseClassifier.instance) {
      DiseaseClassifier.instance = new DiseaseClassifier();
    }
    return DiseaseClassifier.instance;
  }

  async loadModel(): Promise<ort.InferenceSession> {
    if (!this.session) {
      const modelPath = resolve(config.modelPath);
      logger.info(`Loading ONNX model from: ${modelPath}`);
      this.session = await ort.InferenceSession.create(modelPath);
      logger.info('ONNX model loaded successfully');
    }
    return this.session;
  }

  async predict(base64Image: string) {
    const session = await this.loadModel();

    // Preprocess image to tensor
    const inputTensor = await this.imageToTensor(base64Image);

    // Run inference
    const feeds: Record<string, ort.Tensor> = { input: inputTensor };
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
    const processor = new ImageProcessor();
    const preprocessed = await processor.preprocess(base64Image);

    // Convert buffer to float32 array normalized to [0, 1]
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

### 7.3 LLM Service (NVIDIA NIM API)

```typescript
// src/services/llmService.ts
import OpenAI from 'openai';
import { config } from '../config';
import { logger } from '../utils/logger';

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
    latitude?: number;
    longitude?: number;
  };
}

export class LLMService {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      baseURL: 'https://integrate.api.nvidia.com/v1',
      apiKey: config.nvidiaApiKey,
    });
    this.model = config.llmModel;
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
      logger.error('LLM Service Error:', error);
      return this.getFallbackResponse(input);
    }
  }

  private buildPrompt(input: RecommendationInput): string {
    let prompt = `A ${input.crop} crop has been diagnosed with ${input.disease}.

Detection Details:
- Confidence: ${(input.confidence * 100).toFixed(1)}%
- Severity: ${input.severity}
`;

    if (input.location?.latitude && input.location?.longitude) {
      prompt += `
Location: Lat ${input.location.latitude}, Lon ${input.location.longitude} (India)
`;
    }

    prompt += `
Please provide comprehensive treatment recommendations in JSON format.`;

    return prompt;
  }

  private parseResponse(content: string) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      logger.error('Failed to parse LLM response:', e);
    }

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

## 8. Middleware

### 8.1 Global Error Handler

```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error(`Error: ${err.message}`, { stack: err.stack });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // Unexpected errors
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
}
```

### 8.2 Rate Limiter

```typescript
// src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

---

## 9. Shared Types & Constants

### 9.1 Custom Error Classes

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

export class BlurDetectedError extends AppError {
  public blurScore: number;

  constructor(blurScore: number) {
    super(400, 'BLUR_DETECTED', 'Image is too blurry. Please capture a clearer photo.');
    this.blurScore = blurScore;
  }
}

export class LowConfidenceError extends AppError {
  constructor() {
    super(200, 'LOW_CONFIDENCE', 'Confidence too low for reliable diagnosis.');
  }
}

export class LLMServiceError extends AppError {
  constructor(message: string) {
    super(502, 'LLM_SERVICE_ERROR', message);
  }
}
```

### 9.2 Constants

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
      'Target Spot', 'Yellow Leaf Curl Virus', 'Mosaic Virus',
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

### 9.3 TypeScript Types

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
  metadata?: {
    modelVersion: string;
    timestamp: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export type CropType = 'tomato' | 'apple' | 'grape' | 'auto';
```

---

## 10. Logger Utility

```typescript
// src/utils/logger.ts
import winston from 'winston';
import { config } from '../config';

export const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    config.nodeEnv === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${message} ${
              Object.keys(meta).length ? JSON.stringify(meta) : ''
            }`;
          })
        )
  ),
  transports: [new winston.transports.Console()],
});
```

---

## 11. ML Model Options for Node.js

### Option A: ONNX Runtime for Node.js (Recommended)
```typescript
// Uses onnxruntime-node (server-side, native bindings)
import * as ort from 'onnxruntime-node';

const session = await ort.InferenceSession.create('./model/model.onnx');
const results = await session.run({ input: tensor });
```

**Pros:**
- Native C++ bindings → fast inference
- No Python dependency needed
- Model loaded once, reused across requests

**Cons:**
- Requires converting model to ONNX format
- Larger native dependency

### Option B: Python Microservice via HTTP (Fallback)

```
┌─────────────────┐      ┌──────────────────┐
│   Express.js    │─────▶│  Python FastAPI   │
│   /api/analyze  │ HTTP │  ML Inference     │
└─────────────────┘      └──────────────────┘
```

```typescript
// src/services/diseaseClassifier.ts (Python microservice variant)
import { config } from '../config';

export class DiseaseClassifier {
  private apiUrl: string;

  constructor() {
    this.apiUrl = config.mlServiceUrl;
  }

  async predict(base64Image: string) {
    const response = await fetch(`${this.apiUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      throw new Error(`ML service error: ${response.statusText}`);
    }

    return response.json();
  }
}
```

---

## 12. Caching Service

```typescript
// src/services/cacheService.ts
import { LRUCache } from 'lru-cache';
import crypto from 'crypto';

const cache = new LRUCache<string, any>({
  max: 100,              // Max 100 cached predictions
  ttl: 1000 * 60 * 30,   // 30 minute TTL
});

export function getCachedPrediction(imageBase64: string) {
  const hash = hashImage(imageBase64);
  return cache.get(hash);
}

export function cachePrediction(imageBase64: string, result: any) {
  const hash = hashImage(imageBase64);
  cache.set(hash, result);
}

function hashImage(imageBase64: string): string {
  return crypto.createHash('md5').update(imageBase64).digest('hex');
}
```

---

## 13. Environment Configuration

```bash
# .env.example

# Server
PORT=8000
NODE_ENV=development

# NVIDIA API (Required for LLM recommendations)
NVIDIA_API_KEY=nvapi-your_key_here
LLM_MODEL=meta/llama-3.1-70b-instruct

# ML Service (if using Python microservice instead of ONNX)
ML_SERVICE_URL=http://localhost:8001

# Validation
BLUR_THRESHOLD=100
CONFIDENCE_THRESHOLD=0.60
MAX_IMAGE_SIZE_MB=10

# Model paths
MODEL_PATH=./model/model.onnx
CLASS_LABELS_PATH=./model/class_labels.json
```

---

## 14. tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## 15. Running the Application

### Development
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start dev server (with hot reload via tsx)
npm run dev

# Server runs on http://localhost:8000
```

### Production
```bash
# Build TypeScript
npm run build

# Start with Node.js
npm start

# Or start with PM2 (clustering)
npm run start:prod
```

---

## 16. Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy source & build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Copy model files
COPY model/ ./model/

EXPOSE 8000
CMD ["node", "dist/index.js"]
```

```bash
# Build and run
docker build -t agrivision-api .
docker run -p 8000:8000 --env-file .env agrivision-api
```

---

## 17. Testing

### Unit Test Example
```typescript
// tests/analyze.test.ts
import request from 'supertest';
import { app } from '../src/app';

describe('POST /api/analyze', () => {
  it('should return 400 for missing image', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return prediction for valid image', async () => {
    const testImage = 'data:image/png;base64,...'; // base64 test image

    const res = await request(app)
      .post('/api/analyze')
      .send({ image: testImage, cropType: 'tomato' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.prediction).toBeDefined();
  });
});

describe('GET /api/health', () => {
  it('should return healthy status', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});

describe('GET /api/crops', () => {
  it('should return list of crops', async () => {
    const res = await request(app).get('/api/crops');

    expect(res.status).toBe(200);
    expect(res.body.crops).toBeInstanceOf(Array);
    expect(res.body.crops.length).toBeGreaterThan(0);
  });
});
```

---

## 18. Quick Start Commands

```bash
# Create backend directory & initialize
cd backend
npm init -y

# Install production dependencies
npm install express cors dotenv helmet morgan express-rate-limit zod openai onnxruntime-node sharp exifr winston lru-cache multer

# Install dev dependencies
npm install -D typescript tsx @types/node @types/express @types/cors @types/morgan @types/multer eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser jest ts-jest @types/jest supertest @types/supertest

# Create directory structure
mkdir -p src/{config,routes,controllers,services,middleware,lib,utils}
mkdir -p model tests

# Initialize TypeScript
npx tsc --init

# Start development
npm run dev
```

---

## 19. Key Differences: Next.js vs Pure Node.js

| Aspect | Next.js Version | Node.js + Express |
|--------|----------------|-------------------|
| **Frontend** | Included (React) | Separate (in `frontend/` folder) |
| **API Routes** | `pages/api/*.ts` | `routes/*.routes.ts` + controllers |
| **Architecture** | Monolithic full-stack | Standalone REST API |
| **ML Inference** | `onnxruntime-web` (browser) | `onnxruntime-node` (server, faster) |
| **Middleware** | Next.js built-in | Express middleware stack |
| **Error Handling** | Per-route try/catch | Global error handler middleware |
| **Deployment** | Vercel (optimal) | Any server / Docker / PM2 |
| **Hot Reload** | `next dev` | `tsx watch` |
| **Production** | `next build && next start` | `tsc && node dist/index.js` |

---

*Backend Brainstorm (Node.js + Express) - AgriVision Team*
