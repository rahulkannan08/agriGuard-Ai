import { CLASS_LABELS, SEVERITY_RULES } from '../lib/constants';
import { PredictionResult } from '../lib/types';
import { logger } from '../utils/logger';
import crypto from 'crypto';

/**
 * Mock Disease Classifier for development/demo.
 * Returns realistic-looking predictions based on image hash
 * so the same image always gets the same prediction.
 */
export class MockDiseaseClassifier {

  async predict(base64Image: string): Promise<PredictionResult> {
    logger.info('Running mock disease classification');

    // Use image hash to get deterministic but varied results
    const hash = crypto.createHash('md5').update(base64Image).digest('hex');
    const hashNum = parseInt(hash.substring(0, 8), 16);

    // Select a disease class based on hash
    const classIndex = hashNum % CLASS_LABELS.length;
    const diseaseClass = CLASS_LABELS[classIndex];

    // Generate confidence between 0.65 and 0.98 based on hash
    const confidenceBase = parseInt(hash.substring(8, 12), 16);
    const confidence = 0.65 + (confidenceBase % 33) / 100;

    // Parse crop and disease name
    const [crop, ...diseaseParts] = diseaseClass.split('___');
    const diseaseName = diseaseParts.join(' ').replace(/_/g, ' ');

    // Determine severity
    const severity = this.calculateSeverity(diseaseClass, confidence);

    // Build top 3 predictions
    const topPredictions = this.getTopPredictions(classIndex, confidence);

    // Simulate some processing time (50-150ms)
    const delay = 50 + (hashNum % 100);
    await new Promise(resolve => setTimeout(resolve, delay));

    return {
      disease: diseaseClass,
      diseaseName: diseaseName || 'Healthy',
      crop: crop.toLowerCase(),
      confidence: parseFloat(confidence.toFixed(4)),
      severity,
      topPredictions,
    };
  }

  private calculateSeverity(disease: string, confidence: number): PredictionResult['severity'] {
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

  private getTopPredictions(primaryIndex: number, primaryConfidence: number) {
    const predictions = [
      {
        disease: CLASS_LABELS[primaryIndex],
        confidence: parseFloat(primaryConfidence.toFixed(4)),
      },
    ];

    // Add 2 more predictions with lower confidence
    const remaining = CLASS_LABELS.filter((_, i) => i !== primaryIndex);
    for (let i = 0; i < 2 && i < remaining.length; i++) {
      predictions.push({
        disease: remaining[i],
        confidence: parseFloat((primaryConfidence * (0.15 - i * 0.05)).toFixed(4)),
      });
    }

    return predictions;
  }
}
