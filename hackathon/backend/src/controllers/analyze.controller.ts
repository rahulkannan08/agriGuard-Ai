import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ImageProcessor } from '../services/imageProcessor';
import { MockDiseaseClassifier } from '../services/mockDiseaseClassifier';
import { LLMService } from '../services/llmService';
import { LocationService } from '../services/locationService';
import { getCachedPrediction, cachePrediction } from '../services/cacheService';
import { AppError } from '../lib/errors';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ExternalAIService } from '../services/externalAIService';
import { AnalysisHistory } from '../models/AnalysisHistory';
import sharp from 'sharp';
import exifr from 'exifr';

// Request validation schema
const analyzeSchema = z.object({
  image: z.string().min(1, 'Image is required'),
  cropType: z.enum(['tomato', 'apple', 'grape', 'auto']).optional().default('auto'),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).optional(),
});

const analyzeChatSchema = z.object({
  question: z.string().min(2, 'Question is required').max(1000, 'Question is too long'),
  language: z.enum(['en', 'hi', 'ta', 'te', 'kn', 'ml']).optional().default('en'),
  context: z.object({
    prediction: z.record(z.unknown()).nullable().optional(),
    validation: z.record(z.unknown()).nullable().optional(),
    recommendations: z.record(z.unknown()).nullable().optional(),
    warning: z.record(z.unknown()).nullable().optional(),
  }).optional(),
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1).max(2000),
    })
  ).max(10).optional().default([]),
});

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    role?: string;
  };
}

interface AnalysisHistoryLeanEntry {
  _id?: unknown;
  createdAt?: unknown;
  location?: {
    latitude?: number;
    longitude?: number;
  } | null;
  imageMetadata?: Record<string, unknown> | null;
  prediction?: Record<string, unknown> | null;
  validation?: Record<string, unknown> | null;
  recommendations?: Record<string, unknown> | null;
  warning?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  imageMimeType?: string;
  previewBuffer?: unknown;
}

interface HeatmapHistoryLeanEntry {
  _id?: unknown;
  createdAt?: unknown;
  location?: {
    latitude?: number;
    longitude?: number;
  } | null;
  imageMetadata?: Record<string, unknown> | null;
  prediction?: Record<string, unknown> | null;
}

function bufferToBase64(binary: unknown): string {
  if (Buffer.isBuffer(binary)) {
    return binary.toString('base64');
  }

  if (binary instanceof Uint8Array) {
    return Buffer.from(binary).toString('base64');
  }

  const objectValue = binary as { data?: number[]; buffer?: unknown } | undefined;
  const directData = objectValue?.data;
  if (Array.isArray(directData)) {
    return Buffer.from(directData).toString('base64');
  }

  const nestedBuffer = objectValue?.buffer;
  if (Buffer.isBuffer(nestedBuffer)) {
    return nestedBuffer.toString('base64');
  }

  if (nestedBuffer instanceof Uint8Array) {
    return Buffer.from(nestedBuffer).toString('base64');
  }

  const nestedData = (nestedBuffer as { data?: number[] } | undefined)?.data;
  if (Array.isArray(nestedData)) {
    return Buffer.from(nestedData).toString('base64');
  }

  return '';
}

function toObjectRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

function normalizeLocation(location?: {
  latitude?: number;
  longitude?: number;
} | null): { latitude: number; longitude: number } | null {
  if (!location) {
    return null;
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

function readDiseaseName(prediction: Record<string, unknown> | null): string {
  if (!prediction) {
    return 'Unknown';
  }

  const diseaseName = prediction.diseaseName;
  if (typeof diseaseName === 'string' && diseaseName.trim()) {
    return diseaseName.trim();
  }

  const disease = prediction.disease;
  if (typeof disease === 'string' && disease.trim()) {
    return disease.replace(/_/g, ' ').trim();
  }

  return 'Unknown';
}

function readPredictionSeverity(prediction: Record<string, unknown> | null): string | null {
  if (!prediction) {
    return null;
  }

  const severity = prediction.severity;
  if (typeof severity === 'string' && severity.trim()) {
    return severity.trim().toLowerCase();
  }

  return null;
}

function readPredictionConfidence(prediction: Record<string, unknown> | null): number | null {
  if (!prediction) {
    return null;
  }

  const confidence = Number(prediction.confidence);
  return Number.isFinite(confidence) ? confidence : null;
}

function isHealthyDisease(diseaseName: string): boolean {
  return diseaseName.toLowerCase().includes('healthy');
}

function isDangerousDetection(
  diseaseName: string,
  severity: string | null,
  confidence: number | null
): boolean {
  if (isHealthyDisease(diseaseName)) {
    return false;
  }

  if (severity === 'critical' || severity === 'high') {
    return true;
  }

  if (severity === 'moderate' && (confidence ?? 0) >= 0.85) {
    return true;
  }

  return (confidence ?? 0) >= 0.92;
}

function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const earthRadiusKm = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function getSafetyStatusByDistance(distanceKm: number): 'unsafe' | 'caution' | 'watch' | 'safe' {
  if (distanceKm <= 2) {
    return 'unsafe';
  }

  if (distanceKm <= 4) {
    return 'caution';
  }

  if (distanceKm <= 6) {
    return 'watch';
  }

  return 'safe';
}

function sanitizeExifMetadata(rawExif: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!rawExif) {
    return null;
  }

  const cameraMake = typeof rawExif.Make === 'string' ? rawExif.Make : null;
  const cameraModel = typeof rawExif.Model === 'string' ? rawExif.Model : null;
  const lensModel = typeof rawExif.LensModel === 'string' ? rawExif.LensModel : null;
  const iso = Number(rawExif.ISO);
  const focalLength = Number(rawExif.FocalLength);
  const altitude = Number(rawExif.GPSAltitude);
  const latitude = Number(rawExif.latitude);
  const longitude = Number(rawExif.longitude);

  const originalDate = rawExif.DateTimeOriginal;
  const capturedAt = originalDate instanceof Date
    ? originalDate.toISOString()
    : typeof originalDate === 'string'
      ? originalDate
      : null;

  return {
    source: 'exif',
    capturedAt,
    cameraMake,
    cameraModel,
    lensModel,
    iso: Number.isFinite(iso) ? iso : null,
    focalLength: Number.isFinite(focalLength) ? focalLength : null,
    altitude: Number.isFinite(altitude) ? altitude : null,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
  };
}

async function extractImageMetadataFromUpload(file: Express.Multer.File): Promise<Record<string, unknown> | null> {
  try {
    const rawExif = (await exifr.parse(file.buffer)) as Record<string, unknown> | null;

    return sanitizeExifMetadata(rawExif);
  } catch {
    return null;
  }
}

function getLocationFromImageMetadata(imageMetadata: Record<string, unknown> | null): { latitude: number; longitude: number } | null {
  if (!imageMetadata) {
    return null;
  }

  const latitude = Number(imageMetadata.latitude);
  const longitude = Number(imageMetadata.longitude);

  return normalizeLocation({ latitude, longitude });
}

async function saveAnalysisHistory(
  userId: string,
  file: Express.Multer.File,
  payload: Record<string, unknown>,
  location?: { latitude?: number; longitude?: number },
  imageMetadata?: Record<string, unknown> | null
) {
  const previewBuffer = await sharp(file.buffer)
    .rotate()
    .resize({
      width: 320,
      height: 320,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 72 })
    .toBuffer();

  await AnalysisHistory.create({
    user: userId,
    imageBuffer: file.buffer,
    previewBuffer,
    imageMimeType: file.mimetype,
    location: normalizeLocation(location),
    imageMetadata: toObjectRecord(imageMetadata),
    prediction: toObjectRecord(payload.prediction),
    validation: toObjectRecord(payload.validation),
    recommendations: toObjectRecord(payload.recommendations),
    warning: toObjectRecord(payload.warning),
    metadata: toObjectRecord(payload.metadata),
  });
}

export async function getAnalysisHistoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
    }

    const requestedLimit = Number(req.query.limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50)
      : 20;

    const docs = await AnalysisHistory.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('prediction validation recommendations warning metadata imageMimeType previewBuffer createdAt location imageMetadata')
      .lean<AnalysisHistoryLeanEntry[]>();

    const history = docs.map((entry) => {
      const previewBase64 = bufferToBase64(entry.previewBuffer);
      const mimeType = typeof entry.imageMimeType === 'string' ? entry.imageMimeType : 'image/jpeg';
      const normalizedLocation = normalizeLocation(entry.location);
      return {
        id: String(entry._id || ''),
        createdAt: entry.createdAt,
        location: normalizedLocation,
        imageMetadata: entry.imageMetadata || null,
        prediction: entry.prediction || null,
        validation: entry.validation || null,
        recommendations: entry.recommendations || null,
        warning: entry.warning || null,
        metadata: entry.metadata || null,
        imageUrl: previewBase64 ? `data:${mimeType};base64,${previewBase64}` : null,
      };
    });

    return res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDiseaseHeatmapController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
    }

    const requestedLimit = Number(req.query.limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.trunc(requestedLimit), 50), 2000)
      : 600;

    const docs = await AnalysisHistory.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('location prediction imageMetadata createdAt')
      .lean<HeatmapHistoryLeanEntry[]>();

    const buckets = new Map<
      string,
      {
        lat: number;
        lng: number;
        count: number;
        diseaseCount: Map<string, number>;
      }
    >();
    const diseaseTotals = new Map<string, number>();

    let latSum = 0;
    let lngSum = 0;
    let totalDetections = 0;
    const rawPins: Array<{
      id: string;
      lat: number;
      lng: number;
      disease: string;
      severity: string | null;
      confidence: number | null;
      isDangerous: boolean;
      detectedAt: string | null;
      imageMetadata: Record<string, unknown> | null;
    }> = [];

    for (let index = 0; index < docs.length; index += 1) {
      const entry = docs[index];
      const location = normalizeLocation(entry.location);
      if (!location) {
        continue;
      }

      const prediction = toObjectRecord(entry.prediction);
      const diseaseName = readDiseaseName(prediction);
      const severity = readPredictionSeverity(prediction);
      const confidence = readPredictionConfidence(prediction);
      const isDangerous = isDangerousDetection(diseaseName, severity, confidence);
      const imageMetadata = toObjectRecord(entry.imageMetadata);
      const detectedAt = entry.createdAt instanceof Date
        ? entry.createdAt.toISOString()
        : typeof entry.createdAt === 'string'
          ? entry.createdAt
          : null;

      rawPins.push({
        id: String(entry._id || `pin-${index}`),
        lat: location.latitude,
        lng: location.longitude,
        disease: diseaseName,
        severity,
        confidence,
        isDangerous,
        detectedAt,
        imageMetadata,
      });

      const bucketLat = Number(location.latitude.toFixed(2));
      const bucketLng = Number(location.longitude.toFixed(2));
      const bucketKey = `${bucketLat}:${bucketLng}`;

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, {
          lat: bucketLat,
          lng: bucketLng,
          count: 0,
          diseaseCount: new Map<string, number>(),
        });
      }

      const bucket = buckets.get(bucketKey);
      if (!bucket) {
        continue;
      }

      bucket.count += 1;
      bucket.diseaseCount.set(diseaseName, (bucket.diseaseCount.get(diseaseName) || 0) + 1);
      diseaseTotals.set(diseaseName, (diseaseTotals.get(diseaseName) || 0) + 1);

      latSum += location.latitude;
      lngSum += location.longitude;
      totalDetections += 1;
    }

    const dangerRings = rawPins.filter((pin) => pin.isDangerous);

    let unsafeFarmers = 0;
    let cautionFarmers = 0;
    let watchFarmers = 0;
    let safeFarmers = 0;

    const pins = rawPins.map((pin) => {
      let nearestDangerKm: number | null = null;

      if (dangerRings.length > 0) {
        let minDistance = Number.POSITIVE_INFINITY;

        for (let i = 0; i < dangerRings.length; i += 1) {
          const dangerPin = dangerRings[i];
          const distance = haversineDistanceKm(pin.lat, pin.lng, dangerPin.lat, dangerPin.lng);
          if (distance < minDistance) {
            minDistance = distance;
          }
        }

        nearestDangerKm = Number(minDistance.toFixed(3));
      }

      const safetyStatus = nearestDangerKm === null
        ? 'safe'
        : getSafetyStatusByDistance(nearestDangerKm);

      if (safetyStatus === 'unsafe') {
        unsafeFarmers += 1;
      } else if (safetyStatus === 'caution') {
        cautionFarmers += 1;
      } else if (safetyStatus === 'watch') {
        watchFarmers += 1;
      } else {
        safeFarmers += 1;
      }

      return {
        ...pin,
        nearestDangerKm,
        safetyStatus,
      };
    });

    const maxCount = Math.max(
      1,
      ...Array.from(buckets.values()).map((bucket) => bucket.count)
    );

    const hotspots = Array.from(buckets.values())
      .map((bucket) => {
        let dominantDisease = 'Unknown';
        let dominantCount = 0;

        bucket.diseaseCount.forEach((diseaseCount, diseaseName) => {
          if (diseaseCount > dominantCount) {
            dominantDisease = diseaseName;
            dominantCount = diseaseCount;
          }
        });

        const intensity = Number((0.2 + (bucket.count / maxCount) * 0.8).toFixed(3));

        return {
          lat: bucket.lat,
          lng: bucket.lng,
          intensity,
          count: bucket.count,
          disease: dominantDisease,
        };
      })
      .sort((a, b) => b.count - a.count);

    const topDiseases = Array.from(diseaseTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([disease, count]) => ({ disease, count }));

    const center: [number, number] =
      totalDetections > 0
        ? [
            Number((latSum / totalDetections).toFixed(6)),
            Number((lngSum / totalDetections).toFixed(6)),
          ]
        : [12.9716, 77.5946];

    return res.status(200).json({
      success: true,
      center,
      hotspots,
      pins: pins.slice(0, 250),
      dangerRings: dangerRings.slice(0, 80).map((pin) => ({
        id: pin.id,
        lat: pin.lat,
        lng: pin.lng,
        disease: pin.disease,
        severity: pin.severity,
      })),
      stats: {
        totalDetections,
        totalHotspots: hotspots.length,
        topDiseases,
        dangerousCases: dangerRings.length,
        unsafeFarmers,
        cautionFarmers,
        watchFarmers,
        safeFarmers,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function analyzeChatController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
    }

    const parsed = analyzeChatSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', parsed.error.message);
    }

    const normalizedHistory = (parsed.data.history || [])
      .filter(
        (
          item
        ): item is { role: 'user' | 'assistant'; content: string } =>
          (item?.role === 'user' || item?.role === 'assistant') &&
          typeof item?.content === 'string' &&
          item.content.trim().length > 0
      )
      .map((item) => ({
        role: item.role,
        content: item.content,
      }));

    const chatContext = parsed.data.context as
      | {
          prediction?: {
            crop?: string;
            diseaseName?: string;
            confidence?: number;
            severity?: string;
          };
          validation?: {
            blurScore?: number;
            isBlurry?: boolean;
          };
          recommendations?: {
            summary?: string;
            immediateActions?: string[];
            preventiveMeasures?: string[];
          };
          warning?: {
            message?: string;
          };
        }
      | undefined;

    const llmService = new LLMService();
    const reply = await llmService.askAnalysisQuestion({
      question: parsed.data.question,
      language: parsed.data.language,
      context: chatContext,
      history: normalizedHistory,
    });

    return res.status(200).json({
      success: true,
      reply,
    });
  } catch (error) {
    next(error);
  }
}

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

    // Run analysis pipeline
    const result = await runAnalysisPipeline(image, cropType, location);
    return res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    next(error);
  }
}

export async function analyzeWithUploadController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.file) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Image file is required');
    }

    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
    }

    const cropType = (req.body.cropType as string) || 'auto';
    let location: { latitude?: number; longitude?: number } | undefined;
    if (req.body.location) {
      try {
        const parsedLocation = JSON.parse(req.body.location as string);
        if (parsedLocation && typeof parsedLocation === 'object') {
          location = parsedLocation;
        }
      } catch {
        location = undefined;
      }
    }

    const imageMetadata = await extractImageMetadataFromUpload(req.file);
    if (!location?.latitude || !location?.longitude) {
      const exifLocation = getLocationFromImageMetadata(imageMetadata);
      if (exifLocation) {
        location = exifLocation;
      }
    }

    // If configured, delegate full analysis to the Python AI backend.
    if (config.useExternalAI) {
      const locationText = location?.latitude && location?.longitude
        ? `${location.latitude},${location.longitude}`
        : (req.body.location as string) || 'Unknown';

      const externalAI = new ExternalAIService();
      const externalResult = await externalAI.predictFromUpload(req.file, {
        location: locationText,
        timeContext: (req.body.timeContext as string) || 'Unknown',
        weather: (req.body.weather as string) || 'Unknown',
      });

      const payload = {
        success: externalResult.success,
        prediction: externalResult.prediction,
        validation: externalResult.validation,
        recommendations: externalResult.recommendations,
        warning: externalResult.warning,
        imageMetadata,
        metadata: {
          modelVersion: '1.0.0',
          timestamp: new Date().toISOString(),
          mockMode: false,
          externalAI: true,
        },
      };

      await saveAnalysisHistory(
        userId,
        req.file,
        payload as Record<string, unknown>,
        location,
        imageMetadata
      );

      return res.status(200).json(payload);
    }

    // Fallback pipeline: local/mock model in this backend.
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Run analysis pipeline
    const result = await runAnalysisPipeline(base64Image, cropType, location);

    await saveAnalysisHistory(
      userId,
      req.file,
      result as Record<string, unknown>,
      location,
      imageMetadata
    );

    return res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    next(error);
  }
}

async function runAnalysisPipeline(
  image: string,
  cropType: string,
  location?: { latitude?: number; longitude?: number }
) {
  // Check cache first
  const cached = getCachedPrediction(image);
  if (cached) {
    logger.info('Returning cached prediction');
    return { ...cached, cached: true };
  }

  // 1. Validate & preprocess image
  const imageProcessor = new ImageProcessor();
  const validation = await imageProcessor.validate(image);

  if (validation.isBlurry) {
    return {
      success: false,
      validation,
      error: {
        code: 'BLUR_DETECTED',
        message: 'Image is too blurry. Please capture a clearer photo.',
      },
    };
  }

  // 2. Try to extract location from EXIF if not provided
  let resolvedLocation = location;
  if (!resolvedLocation?.latitude || !resolvedLocation?.longitude) {
    const locationService = new LocationService();
    const exifLocation = await locationService.extractFromImage(image);
    if (exifLocation.latitude && exifLocation.longitude) {
      resolvedLocation = exifLocation;
    }
  }

  // 3. Run disease classification (mock or real)
  let prediction;
  if (config.useMockML) {
    logger.info('Using mock ML classifier');
    const mockClassifier = new MockDiseaseClassifier();
    prediction = await mockClassifier.predict(image);
  } else {
    const { DiseaseClassifier } = await import('../services/diseaseClassifier');
    const classifier = DiseaseClassifier.getInstance();
    prediction = await classifier.predict(image);
  }

  // 4. Check confidence threshold
  if (prediction.confidence < config.confidenceThreshold) {
    const lowConfResult = {
      success: true,
      prediction,
      validation,
      warning: {
        code: 'LOW_CONFIDENCE',
        message: 'Confidence too low. Consider uploading another image.',
      },
      metadata: {
        modelVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        mockMode: config.useMockML,
      },
    };
    return lowConfResult;
  }

  // 5. Generate LLM recommendations
  const llmService = new LLMService();
  const recommendations = await llmService.getRecommendations({
    crop: prediction.crop,
    disease: prediction.diseaseName,
    confidence: prediction.confidence,
    severity: prediction.severity,
    location: resolvedLocation,
  });

  // 6. Build complete result
  const result = {
    success: true,
    prediction,
    validation,
    recommendations,
    metadata: {
      modelVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      mockMode: config.useMockML,
    },
  };

  // Cache the result
  cachePrediction(image, result);

  return result;
}
