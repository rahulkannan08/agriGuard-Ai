import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database & Auth
  mongoURI: process.env.MONGODB_URI || 'mongodb://localhost:27017/agrivision',
  jwtSecret: process.env.JWT_SECRET || 'agrivision-super-secret-key-change-in-production',

  // NVIDIA API (LLM)
  nvidiaApiKey: process.env.NVIDIA_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'meta/llama-3.1-70b-instruct',
  llmProvider: process.env.LLM_PROVIDER || 'gemini',

  // Gemini API (LLM)
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  geminiApiKeys: [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    ...(process.env.GEMINI_API_KEYS || '')
      .split(',')
      .map((key) => key.trim()),
  ].filter((key): key is string => Boolean(key && key.length > 0)),

  // LiveKit
  livekitUrl: process.env.LIVEKIT_URL || '',
  livekitApiKey: process.env.LIVEKIT_API_KEY || '',
  livekitApiSecret: process.env.LIVEKIT_API_SECRET || '',
  deepgramApiKey: process.env.DEEPGRAM_API_KEY || '',
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  elevenlabsModelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
  elevenlabsVoiceIdDefault: process.env.ELEVENLABS_VOICE_ID || '',
  elevenlabsVoiceIdTamil: process.env.ELEVENLABS_VOICE_ID_TAMIL || '',
  elevenlabsVoiceIdKannada: process.env.ELEVENLABS_VOICE_ID_KANNADA || '',

  // ML Service
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8001',
  useMockML: process.env.USE_MOCK_ML !== 'false', // defaults to true
  useExternalAI: process.env.USE_EXTERNAL_AI === 'true',

  // Validation
  blurThreshold: parseFloat(process.env.BLUR_THRESHOLD || '100'),
  confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.60'),
  maxImageSizeMB: parseInt(process.env.MAX_IMAGE_SIZE_MB || '10', 10),

  // Model paths
  modelPath: process.env.MODEL_PATH || './model/model.onnx',
  classLabelsPath: process.env.CLASS_LABELS_PATH || './model/class_labels.json',
};
