import { AgentProcessingResult } from '../types/ticket';
import { CONFIG } from '../config/constants';
import { SCENARIO_HIGH_CONFIDENCE, SCENARIO_DUPLICATE_FOUND, SCENARIO_LOW_CONFIDENCE } from '../mock/mockData';
import { VoiceDictationService } from './VoiceDictationService';

export class GeminiService {
  private static instance: GeminiService;
  private fallbackCounter: number = 0;

  private constructor() {}

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  /**
   * Processes an audio recording (Blob) using the Gemini Flash Multimodal API.
   * Performs Speech-To-Text (STT), intent classification, field extraction, confidence scoring, and suggested question generation.
   * Includes automated model fallback & offline fallback mode for rate-limited (429) keys.
   */
  public async processAudio(audioBlob: Blob, spokenText?: string): Promise<AgentProcessingResult> {
    const base64Audio = await this.blobToBase64(audioBlob);
    const mimeType = audioBlob.type || CONFIG.SPEECH.DEFAULT_AUDIO_MIME_TYPE;

    const systemPrompt = `
You are an AI Water Utility Dispatcher for Водоканал (WSN).
Analyze the incoming voice call audio and extract structured data.

Output strictly valid JSON matching this schema:
{
  "callId": "CALL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}",
  "transcript": "[00:01] AI-Агент: ...\\n[00:05] Заявник: ...",
  "requiresTicketRegistration": true/false (true if emergency leak/damage/accident requiring a repair crew; false if general pricing info or tariffs inquiry),
  "ticket": {
    "appealType": "One of: Витік холодної води, Порив водопроводу, Відсутнє водопостачання, Пошкодження/відсутність люка, Засмічення каналізації, Консультація / Тарифи, Другое",
    "ticketType": "One of: Аварійна, Планова, Інформаційна, Інше",
    "applicantName": "Full name if spoken",
    "applicantAddress": "Residential address if spoken",
    "addressText": "Location of incident/accident",
    "coordinates": "lat, lng coordinates if spoken or empty string",
    "phoneNumber": "Phone number if mentioned or +380...",
    "incidentDateTime": "${new Date().toISOString().slice(0, 16)}",
    "notes": "Concise detailed description of problem"
  },
  "confidence": {
    "speechRecognition": number between 0.0 and 1.0,
    "classification": number between 0.0 and 1.0,
    "addressExtraction": number between 0.0 and 1.0,
    "geocoding": number between 0.0 and 1.0
  },
  "requiresManualReview": boolean (true if any confidence score < ${CONFIG.CONFIDENCE_THRESHOLD}),
  "suggestedQuestions": ["Question 1?", "Question 2?"]
}
`;

    const candidateModels = Array.from(new Set([
      CONFIG.GEMINI_MODEL,
      ...CONFIG.GEMINI_CANDIDATE_MODELS
    ]));

    let response: Response | null = null;

    for (const modelName of candidateModels) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Audio
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1
            }
          })
        });

        if (res.ok) {
          response = res;
          break;
        } else {
          console.warn(`Gemini model ${modelName} returned status ${res.status}`);
        }
      } catch (e) {
        console.warn(`Fetch error for Gemini model ${modelName}:`, e);
      }
    }

    // If Gemini API is rate-limited (429) or all models fail, parse exact spoken text or fall back
    if (!response || !response.ok) {
      console.info('Gemini API quota reached or unavailable. Activating dynamic voice dictation processor.');
      if (spokenText && spokenText.trim().length > 0) {
        return await VoiceDictationService.getInstance().parseSpokenText(spokenText);
      }
      return this.getOfflineFallbackResult();
    }

    const data = await response.json();
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawJson) {
      return this.getOfflineFallbackResult();
    }

    let parsedResult: AgentProcessingResult;
    try {
      parsedResult = JSON.parse(rawJson);
    } catch {
      return this.getOfflineFallbackResult();
    }

    // Automated Geocoding Fallback via OpenStreetMap Nominatim API if coordinates are missing
    if (parsedResult.ticket.addressText && (!parsedResult.ticket.coordinates || !parsedResult.ticket.coordinates.trim())) {
      try {
        const coords = await this.geocodeAddress(parsedResult.ticket.addressText);
        if (coords) {
          parsedResult.ticket.coordinates = coords;
          parsedResult.confidence.geocoding = Math.max(parsedResult.confidence.geocoding, CONFIG.HIGH_CONFIDENCE_THRESHOLD);
        }
      } catch {
        // Ignore geocoding failure gracefully
      }
    }

    // Default coordinates fallback if still missing and registration required
    if (parsedResult.requiresTicketRegistration && (!parsedResult.ticket.coordinates || !parsedResult.ticket.coordinates.trim())) {
      parsedResult.ticket.coordinates = CONFIG.GEOCODING.DEFAULT_COORDINATES;
    }

    if (!parsedResult.duplicatesFound) {
      parsedResult.duplicatesFound = [];
    }

    return parsedResult;
  }

  /**
   * Provides a fallback result cycling through the 3 requested primary scenarios
   */
  private getOfflineFallbackResult(): AgentProcessingResult {
    const scenarios = [SCENARIO_HIGH_CONFIDENCE, SCENARIO_DUPLICATE_FOUND, SCENARIO_LOW_CONFIDENCE];
    const selected = scenarios[this.fallbackCounter % scenarios.length];
    this.fallbackCounter++;

    return JSON.parse(JSON.stringify(selected));
  }

  /**
   * Geocodes an address string using OpenStreetMap Nominatim API
   */
  private async geocodeAddress(addressStr: string): Promise<string | null> {
    try {
      const query = encodeURIComponent(`${addressStr}, ${CONFIG.GEOCODING.DEFAULT_CITY_SUFFIX}`);
      const url = `${CONFIG.GEOCODING.NOMINATIM_BASE_URL}?q=${query}&format=json&limit=1`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': CONFIG.GEOCODING.USER_AGENT
        }
      });
      if (res.ok) {
        const items = await res.json();
        if (items && items.length > 0) {
          const lat = parseFloat(items[0].lat).toFixed(4);
          const lon = parseFloat(items[0].lon).toFixed(4);
          return `${lat}, ${lon}`;
        }
      }
    } catch {
      return null;
    }
    return null;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
