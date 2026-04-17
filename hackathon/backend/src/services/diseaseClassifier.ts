import { existsSync } from 'fs';
import { resolve } from 'path';
import { CLASS_LABELS, SEVERITY_RULES } from '../lib/constants';
import { config } from '../config';
import { ImageProcessor } from './imageProcessor';
import { logger } from '../utils/logger';
import { ModelNotFoundError } from '../lib/errors';
import { PredictionResult } from '../lib/types';

/**
 * Real Disease Classifier using ONNX Runtime.
 * Only loaded when USE_MOCK_ML=false and onnxruntime-node is installed.
 */
export class DiseaseClassifier {
  private static instance: DiseaseClassifier;
  private session: any | null = null;
  private ort: any | null = null;
  private imageProcessor: ImageProcessor;

  private constructor() {
    this.imageProcessor = new ImageProcessor();
  }

  // Singleton — load model once, reuse across requests
  static getInstance(): DiseaseClassifier {
    if (!DiseaseClassifier.instance) {
      DiseaseClassifier.instance = new DiseaseClassifier();
    }
    return DiseaseClassifier.instance;
  }

  private async loadOrt() {
    if (!this.ort) {
      try {
        this.ort = await import('onnxruntime-node');
      } catch (e) {
        throw new Error(
          'onnxruntime-node is not installed. Install it with: npm install onnxruntime-node\n' +
          'Or set USE_MOCK_ML=true in your .env file to use mock predictions.'
        );
      }
    }
    return this.ort;
  }

  async loadModel(): Promise<any> {
    if (!this.session) {
      const ort = await this.loadOrt();
      const modelPath = resolve(config.modelPath);

      if (!existsSync(modelPath)) {
        throw new ModelNotFoundError(modelPath);
      }

      logger.info(`Loading ONNX model from: ${modelPath}`);

      this.session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all',
      });

      logger.info('ONNX model loaded successfully');
      logger.info(`Model inputs: ${this.session.inputNames.join(', ')}`);
      logger.info(`Model outputs: ${this.session.outputNames.join(', ')}`);
    }
    return this.session;
  }

  async predict(base64Image: string): Promise<PredictionResult> {
    const ort = await this.loadOrt();
    const session = await this.loadModel();

    // Preprocess image to tensor
    const inputTensor = await this.imageToTensor(base64Image, ort);

    // Get the input name from the model
    const inputName = session.inputNames[0];
    const outputName = session.outputNames[0];

    // Run inference
    const feeds: Record<string, any> = { [inputName]: inputTensor };
    const results = await session.run(feeds);
    const output = results[outputName].data as Float32Array;

    // Apply softmax if needed (depends on model architecture)
    const probabilities = this.softmax(output);

    // Get prediction
    const maxIndex = this.argMax(probabilities);
    const confidence = probabilities[maxIndex];
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
      topPredictions: this.getTopPredictions(probabilities, 3),
    };
  }

  private async imageToTensor(base64Image: string, ort: any): Promise<any> {
    const pixels = await this.imageProcessor.preprocessToTensor(base64Image);

    // Shape: [1, 224, 224, 3] (batch, height, width, channels) - NHWC format
    return new ort.Tensor('float32', pixels, [1, 224, 224, 3]);
  }

  private softmax(arr: Float32Array): Float32Array {
    let maxVal = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < arr.length; i += 1) {
      if (arr[i] > maxVal) {
        maxVal = arr[i];
      }
    }

    const expArr = new Float32Array(arr.length);
    let sumExp = 0;
    for (let i = 0; i < arr.length; i += 1) {
      const expValue = Math.exp(arr[i] - maxVal);
      expArr[i] = expValue;
      sumExp += expValue;
    }

    const probabilities = new Float32Array(arr.length);
    if (sumExp <= 0) {
      return probabilities;
    }

    for (let i = 0; i < arr.length; i += 1) {
      probabilities[i] = expArr[i] / sumExp;
    }

    return probabilities;
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

  private getTopPredictions(output: Float32Array, n: number) {
    const indexed = Array.from(output).map((val, idx) => ({ val, idx }));
    indexed.sort((a, b) => b.val - a.val);

    return indexed.slice(0, n).map(item => ({
      disease: CLASS_LABELS[item.idx],
      confidence: item.val,
    }));
  }

  async isModelLoaded(): Promise<boolean> {
    return this.session !== null;
  }

  async checkModelExists(): Promise<boolean> {
    const modelPath = resolve(config.modelPath);
    return existsSync(modelPath);
  }
}
