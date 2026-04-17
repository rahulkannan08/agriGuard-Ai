import { NextFunction, Request, Response } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { AppError } from '../lib/errors';
import { config } from '../config';

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    role?: string;
  };
}

type LiveKitLanguageCode = 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'ml';

const LIVEKIT_LANGUAGE_PROFILE: Record<
  LiveKitLanguageCode,
  { name: string; sttLanguage: string; ttsLanguage: string }
> = {
  en: { name: 'English', sttLanguage: 'en-US', ttsLanguage: 'en-US' },
  hi: { name: 'Hindi', sttLanguage: 'hi-IN', ttsLanguage: 'hi-IN' },
  ta: { name: 'Tamil', sttLanguage: 'ta-IN', ttsLanguage: 'ta-IN' },
  te: { name: 'Telugu', sttLanguage: 'te-IN', ttsLanguage: 'te-IN' },
  kn: { name: 'Kannada', sttLanguage: 'kn-IN', ttsLanguage: 'kn-IN' },
  ml: { name: 'Malayalam', sttLanguage: 'ml-IN', ttsLanguage: 'ml-IN' },
};

const ELEVENLABS_LANGUAGE_CODES: Record<LiveKitLanguageCode, string> = {
  en: 'en',
  hi: 'hi',
  ta: 'ta',
  te: 'te',
  kn: 'kn',
  ml: 'ml',
};

type ElevenLabsVoice = {
  voice_id?: string;
  name?: string;
  labels?: Record<string, unknown>;
};

type LiveKitAnalysisContext = {
  crop?: string;
  disease?: string;
  confidence?: number;
  severity?: string;
  summary?: string;
};

const LIVEKIT_SUPPORTED_LANGUAGES = new Set<LiveKitLanguageCode>([
  'en',
  'hi',
  'ta',
  'te',
  'kn',
  'ml',
]);

function normalizeLanguage(value: unknown): LiveKitLanguageCode {
  if (typeof value !== 'string') {
    return 'en';
  }

  const normalized = value.trim().toLowerCase() as LiveKitLanguageCode;
  return LIVEKIT_SUPPORTED_LANGUAGES.has(normalized) ? normalized : 'en';
}

function normalizeAnalysisContext(value: unknown): LiveKitAnalysisContext | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const input = value as Record<string, unknown>;

  const crop = typeof input.crop === 'string' ? input.crop.trim().slice(0, 64) : undefined;
  const disease =
    typeof input.disease === 'string' ? input.disease.trim().slice(0, 128) : undefined;
  const severity =
    typeof input.severity === 'string' ? input.severity.trim().slice(0, 32) : undefined;
  const summary =
    typeof input.summary === 'string' ? input.summary.trim().slice(0, 240) : undefined;

  let confidence: number | undefined;
  if (typeof input.confidence === 'number' && Number.isFinite(input.confidence)) {
    confidence = input.confidence;
  }

  if (!crop && !disease && confidence === undefined && !severity && !summary) {
    return null;
  }

  return {
    ...(crop ? { crop } : {}),
    ...(disease ? { disease } : {}),
    ...(confidence !== undefined ? { confidence } : {}),
    ...(severity ? { severity } : {}),
    ...(summary ? { summary } : {}),
  };
}

function sanitizeConfiguredVoiceId(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const normalized = trimmed.toLowerCase();
  if (
    normalized.startsWith('your_') ||
    normalized.includes('voice_id') ||
    normalized === 'changeme' ||
    normalized === 'replace_me'
  ) {
    return '';
  }

  return trimmed;
}

function matchesVoiceLanguageHint(voice: ElevenLabsVoice, language: LiveKitLanguageCode): boolean {
  const labelLanguage = String(voice.labels?.language || voice.labels?.locale || '').toLowerCase();
  const name = String(voice.name || '').toLowerCase();

  if (language === 'ta') {
    return labelLanguage.includes('tamil') || labelLanguage.startsWith('ta') || name.includes('tamil');
  }

  if (language === 'kn') {
    return (
      labelLanguage.includes('kannada') ||
      labelLanguage.startsWith('kn') ||
      name.includes('kannada')
    );
  }

  return labelLanguage.startsWith(language) || name.includes(language);
}

async function fetchBestAvailableElevenLabsVoiceId(
  language: LiveKitLanguageCode
): Promise<string> {
  if (!config.elevenlabsApiKey) {
    return '';
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': config.elevenlabsApiKey,
      },
    });

    if (!response.ok) {
      return '';
    }

    const data = (await response.json()) as { voices?: ElevenLabsVoice[] };
    const voices = Array.isArray(data.voices) ? data.voices : [];
    if (!voices.length) {
      return '';
    }

    const hinted = voices.find((voice) => {
      const voiceId = sanitizeConfiguredVoiceId(voice.voice_id);
      return !!voiceId && matchesVoiceLanguageHint(voice, language);
    });
    if (hinted) {
      return sanitizeConfiguredVoiceId(hinted.voice_id);
    }

    const firstAvailable = voices.find((voice) => sanitizeConfiguredVoiceId(voice.voice_id));
    return firstAvailable ? sanitizeConfiguredVoiceId(firstAvailable.voice_id) : '';
  } catch {
    return '';
  }
}

async function requestElevenLabsSpeech(
  voiceId: string,
  text: string,
  language: LiveKitLanguageCode,
  includeLanguageCode: boolean
): Promise<globalThis.Response> {
  const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
    voiceId
  )}?output_format=mp3_44100_128&optimize_streaming_latency=3`;

  const body: Record<string, unknown> = {
    text,
    model_id: config.elevenlabsModelId,
    voice_settings: {
      stability: 0.45,
      similarity_boost: 0.75,
      style: 0.2,
      use_speaker_boost: true,
    },
  };

  if (includeLanguageCode) {
    body.language_code = ELEVENLABS_LANGUAGE_CODES[language];
  }

  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
      'xi-api-key': config.elevenlabsApiKey,
    },
    body: JSON.stringify(body),
  });
}

function resolveElevenLabsVoiceId(language: LiveKitLanguageCode): string {
  const tamilVoiceId = sanitizeConfiguredVoiceId(config.elevenlabsVoiceIdTamil);
  const kannadaVoiceId = sanitizeConfiguredVoiceId(config.elevenlabsVoiceIdKannada);
  const defaultVoiceId = sanitizeConfiguredVoiceId(config.elevenlabsVoiceIdDefault);

  if (language === 'ta' && tamilVoiceId) {
    return tamilVoiceId;
  }

  if (language === 'kn' && kannadaVoiceId) {
    return kannadaVoiceId;
  }

  if (defaultVoiceId) {
    return defaultVoiceId;
  }

  return '';
}

export async function createLiveKitTokenController(
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

    if (!config.livekitUrl || !config.livekitApiKey || !config.livekitApiSecret) {
      throw new AppError(
        500,
        'LIVEKIT_NOT_CONFIGURED',
        'LiveKit is not fully configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.'
      );
    }

    const roomNameInput = typeof req.body?.roomName === 'string' ? req.body.roomName.trim() : '';
    const participantNameInput =
      typeof req.body?.participantName === 'string' ? req.body.participantName.trim() : '';
    const language = normalizeLanguage(req.body?.language);
    const analysisContext = normalizeAnalysisContext(req.body?.analysisContext);

    const roomName = roomNameInput || `agrivision-room-${Date.now()}`;
    const participantName = participantNameInput || `AgriVision User ${userId.slice(0, 6)}`;
    const languageProfile = LIVEKIT_LANGUAGE_PROFILE[language];

    const metadataPayload = {
      source: 'agrivision',
      userId,
      language,
      languageName: languageProfile.name,
      sttLanguage: languageProfile.sttLanguage,
      ttsLanguage: languageProfile.ttsLanguage,
      createdAt: new Date().toISOString(),
      analysis: analysisContext,
    };

    const token = new AccessToken(config.livekitApiKey, config.livekitApiSecret, {
      identity: `user-${userId}`,
      name: participantName,
      metadata: JSON.stringify(metadataPayload),
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();

    return res.status(200).json({
      success: true,
      wsUrl: config.livekitUrl,
      roomName,
      token: jwt,
      languageSent: language,
      languageNameSent: languageProfile.name,
      sttLanguageSent: languageProfile.sttLanguage,
      ttsLanguageSent: languageProfile.ttsLanguage,
      analysisContextSent: analysisContext,
    });
  } catch (error) {
    next(error);
  }
}

export async function synthesizeLiveKitVoiceController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!config.elevenlabsApiKey) {
      throw new AppError(
        503,
        'ELEVENLABS_NOT_CONFIGURED',
        'ElevenLabs is not configured. Set ELEVENLABS_API_KEY and voice IDs in backend .env.'
      );
    }

    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text) {
      throw new AppError(400, 'INVALID_TEXT', 'Text is required for speech synthesis');
    }

    if (text.length > 2400) {
      throw new AppError(400, 'TEXT_TOO_LONG', 'Text is too long for speech synthesis');
    }

    const language = normalizeLanguage(req.body?.language);
    let voiceId = resolveElevenLabsVoiceId(language);
    if (!voiceId) {
      voiceId = await fetchBestAvailableElevenLabsVoiceId(language);
    }

    if (!voiceId) {
      throw new AppError(
        503,
        'ELEVENLABS_VOICE_NOT_CONFIGURED',
        'No valid ElevenLabs voice ID configured and no account voices found. Set ELEVENLABS_VOICE_ID (or Tamil/Kannada-specific IDs).'
      );
    }

    let elevenLabsResponse = await requestElevenLabsSpeech(voiceId, text, language, true);

    if (!elevenLabsResponse.ok && elevenLabsResponse.status === 404) {
      const fallbackVoiceId = await fetchBestAvailableElevenLabsVoiceId(language);
      if (fallbackVoiceId && fallbackVoiceId !== voiceId) {
        voiceId = fallbackVoiceId;
        elevenLabsResponse = await requestElevenLabsSpeech(voiceId, text, language, true);
      }
    }

    if (
      !elevenLabsResponse.ok &&
      (elevenLabsResponse.status === 400 || elevenLabsResponse.status === 422)
    ) {
      elevenLabsResponse = await requestElevenLabsSpeech(voiceId, text, language, false);
    }

    if (!elevenLabsResponse.ok) {
      const errorBody = await elevenLabsResponse.text();
      throw new AppError(
        502,
        'ELEVENLABS_TTS_FAILED',
        `ElevenLabs TTS failed (${elevenLabsResponse.status}): ${errorBody || 'Unknown error'}`
      );
    }

    const audioBuffer = Buffer.from(await elevenLabsResponse.arrayBuffer());

    res.status(200);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.send(audioBuffer);
  } catch (error) {
    next(error);
  }
}
