import { Buffer } from 'buffer';
import { config } from '../config';
import { AppError } from '../lib/errors';
import { logger } from '../utils/logger';

interface ExternalPredictOptions {
  location?: string;
  timeContext?: string;
  weather?: string;
}

export interface ExternalNormalizedResult {
  success: boolean;
  prediction: {
    disease: string;
    diseaseName: string;
    crop: string;
    confidence: number;
    severity: 'none' | 'low' | 'moderate' | 'high' | 'critical';
    topPredictions: Array<{ disease: string; confidence: number }>;
  };
  validation: {
    blurScore: number;
    isBlurry: boolean;
  };
  recommendations: {
    summary: string;
    immediateActions: string[];
    organicTreatment: string[];
    chemicalTreatment: string[];
    recoveryTime: string;
    preventiveMeasures: string[];
  };
  warning?: {
    code: string;
    message: string;
  };
}

export class ExternalAIService {
  async predictFromUpload(
    file: Express.Multer.File,
    options: ExternalPredictOptions = {}
  ): Promise<ExternalNormalizedResult> {
    const form = new FormData();

    form.append(
      'image',
      new Blob([file.buffer], { type: file.mimetype }),
      file.originalname || 'leaf.jpg'
    );
    form.append('location', options.location || 'Unknown');
    form.append('time_context', options.timeContext || 'Unknown');
    form.append('weather', options.weather || 'Unknown');

    const endpoint = `${config.mlServiceUrl}/predict`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: form,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new AppError(
          502,
          'EXTERNAL_AI_ERROR',
          `AI backend request failed (${response.status}): ${text || 'Unknown error'}`
        );
      }

      const data = await response.json();
      return this.normalize(data);
    } catch (error) {
      logger.error('External AI request failed', { error });
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(502, 'EXTERNAL_AI_UNREACHABLE', 'Unable to reach AI backend service.');
    }
  }

  private normalize(data: any): ExternalNormalizedResult {
    const confidence = Number(data.confidence || 0);
    const blurScore = Number(data.blur_score || 0);
    const severity = this.normalizeSeverity(data.severity);

    const recommendation = data.recommendation || {};
    const immediateActions = this.toTextArray(recommendation.immediate_actions);
    const organicTreatment = this.toTextArray(recommendation.organic_treatment);
    const chemicalTreatment = this.toTextArray(recommendation.chemical_treatment);
    const preventiveMeasures = this.toTextArray(recommendation.preventive_measures);

    const success = data.decision !== 'recapture';

    return {
      success,
      prediction: {
        disease: data.disease || 'Unknown',
        diseaseName: data.disease || 'Unknown',
        crop: (data.crop || 'unknown').toLowerCase(),
        confidence,
        severity,
        topPredictions: [{ disease: data.disease || 'Unknown', confidence }],
      },
      validation: {
        blurScore,
        isBlurry: !success && blurScore > 0,
      },
      recommendations: {
        summary: recommendation.summary || 'No recommendation available.',
        immediateActions,
        organicTreatment,
        chemicalTreatment,
        recoveryTime: recommendation.recovery_estimate || 'Consult local agronomist',
        preventiveMeasures,
      },
      warning: success
        ? undefined
        : {
            code: 'RECAPTURE_REQUIRED',
            message:
              data.confidence_gate_message ||
              'Image quality or confidence is low. Please upload a clearer image.',
          },
    };
  }

  private toTextArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item) => {
      if (typeof item === 'string') {
        return item;
      }
      if (item && typeof item === 'object') {
        return Object.values(item as Record<string, unknown>)
          .filter((v) => typeof v === 'string' && v)
          .join(' | ');
      }
      return String(item);
    });
  }

  private normalizeSeverity(value: string): 'none' | 'low' | 'moderate' | 'high' | 'critical' {
    const raw = (value || '').toLowerCase();
    if (raw === 'none') return 'none';
    if (raw === 'critical') return 'critical';
    if (raw === 'high') return 'high';
    if (raw === 'moderate') return 'moderate';
    return 'low';
  }
}
