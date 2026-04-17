import { Request, Response } from 'express';
import { config } from '../config';
import { LLMService } from '../services/llmService';
import { getCacheStats } from '../services/cacheService';

export async function healthController(req: Request, res: Response) {
  const llmService = new LLMService();
  const providerInfo = llmService.getProviderInfo();

  // Check if ONNX model exists (only if not using mock)
  let modelStatus = 'mock_mode';
  if (!config.useMockML) {
    try {
      const { DiseaseClassifier } = await import('../services/diseaseClassifier');
      const classifier = DiseaseClassifier.getInstance();
      const modelExists = await classifier.checkModelExists();
      modelStatus = modelExists ? 'loaded' : 'not_found';
    } catch {
      modelStatus = 'error';
    }
  }

  res.status(200).json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      llm: {
        configured: llmService.isConfigured(),
        provider: providerInfo.provider,
        model: providerInfo.model,
      },
      livekit: {
        configured: !!(config.livekitUrl && config.livekitApiKey && config.livekitApiSecret),
        url: config.livekitUrl || null,
      },
      voiceProviders: {
        deepgramConfigured: !!config.deepgramApiKey,
        elevenlabsConfigured: !!config.elevenlabsApiKey,
        elevenlabsVoiceConfigured: !!(
          config.elevenlabsVoiceIdDefault ||
          config.elevenlabsVoiceIdTamil ||
          config.elevenlabsVoiceIdKannada
        ),
      },
      ml: {
        status: modelStatus,
        mockMode: config.useMockML,
        externalAI: config.useExternalAI,
        externalAIUrl: config.mlServiceUrl,
      },
      cache: getCacheStats(),
    },
    environment: config.nodeEnv,
  });
}
