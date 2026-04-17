import OpenAI from 'openai';
import { config } from '../config';
import { logger } from '../utils/logger';
import { RecommendationInput, Recommendations } from '../lib/types';

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

const CHAT_SYSTEM_PROMPT = `You are AgriVision AI assistant. Help the farmer understand one specific crop analysis result.

Rules:
1. Give practical guidance in simple language.
2. Use the provided analysis context (disease, confidence, blur, recommendations).
3. If confidence is low or image is blurry, clearly tell the user to recapture and why.
4. If user asks for treatment plan, provide immediate steps, prevention, and when to seek local agronomist help.
5. Keep answers concise and actionable. Use short bullet points when useful.
6. Do not invent exact pesticide dosage unless already present in context; if missing, recommend consulting local extension guidance.`;

type SupportedChatLanguage = 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'ml';

const CHAT_LANGUAGE_NAMES: Record<SupportedChatLanguage, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
};

const CHAT_FALLBACK_INTRO: Record<SupportedChatLanguage, string> = {
  en: 'I could not reach the advanced AI advisor right now, but here is guidance from your result context.',
  hi: 'अभी मैं उन्नत AI सलाहकार तक नहीं पहुंच पाया, लेकिन आपके परिणाम संदर्भ से यह मार्गदर्शन है।',
  ta: 'இப்போது மேம்பட்ட AI ஆலோசகரை அணுக முடியவில்லை, ஆனால் உங்கள் முடிவு சூழலின் அடிப்படையில் இந்த வழிகாட்டல் உள்ளது.',
  te: 'ఇప్పుడే అధునాతన AI సలహాదారిని చేరుకోలేకపోయాను, కానీ మీ ఫలితాల సందర్భం ఆధారంగా ఈ మార్గదర్శకం ఉంది.',
  kn: 'ಈಗ ಮುಂದುವರಿದ AI ಸಲಹೆಗಾರರನ್ನು ಸಂಪರ್ಕಿಸಲಾಗಲಿಲ್ಲ, ಆದರೆ ನಿಮ್ಮ ಫಲಿತಾಂಶದ ಹಿನ್ನೆಲೆಯ ಆಧಾರದಲ್ಲಿ ಈ ಮಾರ್ಗದರ್ಶನ ಇದೆ.',
  ml: 'ഇപ്പോൾ ഉയർന്ന നിലവാരമുള്ള AI ഉപദേഷ്ടാവിനെ ബന്ധപ്പെടാൻ കഴിഞ്ഞില്ല, പക്ഷേ നിങ്ങളുടെ ഫലത്തിന്റെ അടിസ്ഥാനത്തിൽ ഈ മാർഗ്ഗനിർദ്ദേശം ലഭ്യമാണ്.',
};

const CHAT_FALLBACK_ACTIONS_LABEL: Record<SupportedChatLanguage, string> = {
  en: 'Immediate actions:',
  hi: 'तुरंत करने के कदम:',
  ta: 'உடனடி நடவடிக்கைகள்:',
  te: 'తక్షణ చర్యలు:',
  kn: 'ತಕ್ಷಣದ ಕ್ರಮಗಳು:',
  ml: 'ഉടൻ ചെയ്യേണ്ട നടപടികൾ:',
};

const CHAT_FALLBACK_QUESTION_LABEL: Record<SupportedChatLanguage, string> = {
  en: 'Your question:',
  hi: 'आपका सवाल:',
  ta: 'உங்கள் கேள்வி:',
  te: 'మీ ప్రశ్న:',
  kn: 'ನಿಮ್ಮ ಪ್ರಶ್ನೆ:',
  ml: 'നിങ്ങളുടെ ചോദ്യം:',
};

function normalizeChatLanguage(language?: SupportedChatLanguage): SupportedChatLanguage {
  if (!language) {
    return 'en';
  }

  return CHAT_LANGUAGE_NAMES[language] ? language : 'en';
}

type GeminiRole = 'user' | 'model';

interface GeminiContent {
  role: GeminiRole;
  parts: Array<{ text: string }>;
}

interface AnalysisChatInput {
  question: string;
  language?: SupportedChatLanguage;
  context?: {
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
  };
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export class LLMService {
  private client: OpenAI | null;
  private model: string;
  private geminiModel: string;
  private geminiApiKeys: string[];

  constructor() {
    this.client = config.nvidiaApiKey
      ? new OpenAI({
          baseURL: 'https://integrate.api.nvidia.com/v1',
          apiKey: config.nvidiaApiKey,
        })
      : null;
    this.model = config.llmModel;
    this.geminiModel = config.geminiModel;
    this.geminiApiKeys = config.geminiApiKeys;
  }

  private buildChatSystemPrompt(language?: SupportedChatLanguage): string {
    const normalizedLanguage = normalizeChatLanguage(language);
    const languageName = CHAT_LANGUAGE_NAMES[normalizedLanguage];

    return `${CHAT_SYSTEM_PROMPT}
7. Reply fully in ${languageName}.
8. If conversation history is in mixed languages, still answer in ${languageName} unless the user explicitly asks to switch language.
9. Keep crop and disease names exactly as provided in analysis context when needed.`;
  }

  async getRecommendations(input: RecommendationInput): Promise<Recommendations> {
    const prompt = this.buildPrompt(input);
    const preferGemini = String(config.llmProvider).toLowerCase() === 'gemini';

    if (preferGemini) {
      const geminiText = await this.callGemini(
        [{ role: 'user', parts: [{ text: prompt }] }],
        SYSTEM_PROMPT,
        0.7,
        1024
      );
      if (geminiText) {
        return this.parseResponse(geminiText, input);
      }
    }

    const nvidiaText = await this.callNvidiaChat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      1024,
      0.7
    );

    if (nvidiaText) {
      return this.parseResponse(nvidiaText, input);
    }

    if (!preferGemini) {
      const geminiText = await this.callGemini(
        [{ role: 'user', parts: [{ text: prompt }] }],
        SYSTEM_PROMPT,
        0.7,
        1024
      );
      if (geminiText) {
        return this.parseResponse(geminiText, input);
      }
    }

    logger.warn('No LLM provider available, returning fallback recommendation response');
    return this.getFallbackResponse(input);
  }

  async askAnalysisQuestion(input: AnalysisChatInput): Promise<string> {
    const normalizedLanguage = normalizeChatLanguage(input.language);
    const languageName = CHAT_LANGUAGE_NAMES[normalizedLanguage];
    const chatSystemPrompt = this.buildChatSystemPrompt(normalizedLanguage);
    const analysisSummary = this.buildAnalysisSummary(input.context);
    const finalQuestion = `Preferred response language: ${languageName} (${normalizedLanguage}).
Always answer in this language unless the user explicitly asks to switch.

Analysis context:
${analysisSummary}

Farmer question:
${input.question}`;

    const geminiContents: GeminiContent[] = [
      ...(input.history || []).slice(-8).map((item): GeminiContent => {
        const role: GeminiRole = item.role === 'assistant' ? 'model' : 'user';
        return {
          role,
          parts: [{ text: item.content }],
        };
      }),
      { role: 'user' as GeminiRole, parts: [{ text: finalQuestion }] },
    ];

    const geminiReply = await this.callGemini(geminiContents, chatSystemPrompt, 0.5, 700);
    if (geminiReply) {
      return geminiReply;
    }

    const nvidiaMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: chatSystemPrompt },
      ...(input.history || [])
        .slice(-8)
        .map((item) => ({ role: item.role, content: item.content })),
      { role: 'user', content: finalQuestion },
    ];

    const nvidiaReply = await this.callNvidiaChat(nvidiaMessages, 700, 0.5);
    if (nvidiaReply) {
      return nvidiaReply;
    }

    return this.getChatFallback(
      input.question,
      analysisSummary,
      input.context?.recommendations?.immediateActions || [],
      normalizedLanguage
    );
  }

  private async callGemini(
    contents: GeminiContent[],
    systemPrompt: string,
    temperature: number,
    maxOutputTokens: number
  ): Promise<string | null> {
    if (!this.geminiApiKeys.length) {
      return null;
    }

    for (let index = 0; index < this.geminiApiKeys.length; index += 1) {
      const apiKey = this.geminiApiKeys[index];
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents,
            generationConfig: {
              temperature,
              maxOutputTokens,
            },
          }),
        });

        if (!response.ok) {
          logger.warn('Gemini API request failed', {
            status: response.status,
            keyIndex: index + 1,
          });
          continue;
        }

        const data = (await response.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{ text?: string }>;
            };
          }>;
        };

        const text = (data.candidates?.[0]?.content?.parts || [])
          .map((part) => part.text || '')
          .join('')
          .trim();

        if (text) {
          return text;
        }

        logger.warn('Gemini returned empty content', { keyIndex: index + 1 });
      } catch (error) {
        logger.error('Gemini request error', {
          keyIndex: index + 1,
          error,
        });
      }
    }

    return null;
  }

  private async callNvidiaChat(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    maxTokens: number,
    temperature: number
  ): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: maxTokens,
        temperature,
      });

      return response.choices[0]?.message?.content?.trim() || null;
    } catch (error) {
      logger.error('NVIDIA LLM request failed', { error });
      return null;
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

  private parseResponse(content: string, input: RecommendationInput): Recommendations {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Partial<Recommendations>;
        return {
          summary: parsed.summary || `${input.disease} detected on ${input.crop}`,
          immediateActions: parsed.immediateActions || [],
          organicTreatment: parsed.organicTreatment || [],
          chemicalTreatment: parsed.chemicalTreatment || [],
          recoveryTime: parsed.recoveryTime || 'Consult expert',
          preventiveMeasures: parsed.preventiveMeasures || [],
          weatherAdvisory: parsed.weatherAdvisory,
        };
      }
    } catch (e) {
      logger.error('Failed to parse LLM response', { error: e });
    }

    return {
      summary: content || `${input.disease} detected on ${input.crop}`,
      immediateActions: [],
      organicTreatment: [],
      chemicalTreatment: [],
      recoveryTime: 'Consult expert',
      preventiveMeasures: [],
    };
  }

  private getFallbackResponse(input: RecommendationInput): Recommendations {
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

  private buildAnalysisSummary(context?: {
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
  }): string {
    const crop = context?.prediction?.crop || 'Unknown';
    const disease = context?.prediction?.diseaseName || 'Unknown';
    const confidence = Number(context?.prediction?.confidence || 0);
    const severity = context?.prediction?.severity || 'unknown';
    const blurScore = Number(context?.validation?.blurScore || 0);
    const isBlurry = Boolean(context?.validation?.isBlurry);
    const recSummary = context?.recommendations?.summary || 'N/A';
    const warning = context?.warning?.message || 'N/A';

    return [
      `Crop: ${crop}`,
      `Disease: ${disease}`,
      `Confidence: ${(confidence <= 1 ? confidence * 100 : confidence).toFixed(2)}%`,
      `Severity: ${severity}`,
      `Blur score: ${blurScore.toFixed(2)}`,
      `Is blurry: ${isBlurry ? 'yes' : 'no'}`,
      `Recommendation summary: ${recSummary}`,
      `Warning: ${warning}`,
    ].join('\n');
  }

  private getChatFallback(
    question: string,
    analysisSummary: string,
    immediateActions: string[],
    language: SupportedChatLanguage
  ): string {
    const actions = immediateActions.length > 0
      ? immediateActions.slice(0, 3).map((action, index) => `${index + 1}. ${action}`).join('\n')
      : '1. Remove visibly affected leaves.\n2. Avoid overhead watering.\n3. Consult local agronomist for spray schedule.';

    return `${CHAT_FALLBACK_INTRO[language]}\n\n${analysisSummary}\n\n${CHAT_FALLBACK_ACTIONS_LABEL[language]}\n${actions}\n\n${CHAT_FALLBACK_QUESTION_LABEL[language]} ${question}`;
  }

  getProviderInfo(): { provider: string; model: string } {
    if (this.geminiApiKeys.length > 0) {
      return {
        provider: 'gemini',
        model: this.geminiModel,
      };
    }

    if (this.client) {
      return {
        provider: 'nvidia',
        model: this.model,
      };
    }

    return {
      provider: 'none',
      model: 'none',
    };
  }

  isConfigured(): boolean {
    return this.geminiApiKeys.length > 0 || !!this.client;
  }
}
