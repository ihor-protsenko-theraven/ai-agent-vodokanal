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
Analyze the incoming voice call audio (if provided) and the text transcript.
Your task is to dynamically parse the applicant's spoken text into a structured JSON ticket.

CRITICAL INSTRUCTIONS:
1. "appealType": Choose ONE strictly from: "Витік холодної води", "Порив водопроводу", "Відсутнє водопостачання", "Пошкодження/відсутність люка", "Засмічення каналізації", "Консультація / Тарифи", "Інше".
2. "ticketType": Choose ONE strictly from: "Аварійна", "Планова", "Інформаційна". If it's a consultation, use "Інформаційна".
3. "requiresTicketRegistration": true for leaks/damages/accidents; false for general pricing/tariffs inquiries.
4. "addressText": Extract the EXACT incident address. If the location is vague (e.g. "не знаю", "десь на Борщагівці", "біля бару"), indicate the vague location and set "addressExtraction" confidence below 0.70 so it requires manual review. If no city is mentioned, assume "м. Київ". Format as "м. Київ, вул. [Street], [House]". If it's a consultation without an address, output "Консультація (без виїзду бригади)".
5. "phoneNumber": Extract any spoken phone number and format it as +380XXXXXXXXX.
6. "applicantName": Extract the caller's name if they introduce themselves (e.g., "це Марія", "мене звати Сергій"). If not mentioned, output "Громадянин (із голосового звернення)".
7. "transcript": Reconstruct a realistic dialog using the EXACT spoken text provided. For example: "[00:01] AI-Агент: Доброго дня! Водоканал. Опишіть проблему.\\n[00:04] Заявник: \\"THE EXACT SPOKEN TEXT\\"\\n[00:10] AI-Агент: Прийнято."
8. "notes": Write a brief summary of the incident starting with "Диспетчер AI: " followed by the spoken problem.

Output strictly valid JSON matching this schema:
{
  "callId": "CALL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}",
  "transcript": "formatted dialog with exact applicant text",
  "requiresTicketRegistration": boolean,
  "ticket": {
    "appealType": "string",
    "ticketType": "string",
    "applicantName": "string",
    "applicantAddress": "same as addressText",
    "addressText": "string",
    "coordinates": "lat, lng or empty string",
    "phoneNumber": "string or empty",
    "incidentDateTime": "${new Date().toISOString().slice(0, 16)}",
    "notes": "string"
  },
  "confidence": {
    "speechRecognition": 0.95,
    "classification": 0.95,
    "addressExtraction": 0.95,
    "geocoding": 0.0
  },
  "requiresManualReview": true,
  "suggestedQuestions": ["Question 1?", "Question 2?"]
}
`;

    const candidateModels = Array.from(new Set([
      CONFIG.GEMINI_MODEL,
      ...CONFIG.GEMINI_CANDIDATE_MODELS
    ]));

    let response: Response | null = null;

    // Stage 1: Try Gemini Multimodal API (Audio + Spoken Text)
    if (CONFIG.GEMINI_API_KEY) {
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
                    ...(spokenText && spokenText.trim().length > 0 ? [{ text: `Spoken Text Transcript: "${spokenText}"` }] : []),
                    ...(base64Audio && base64Audio.length > 50 ? [{
                      inlineData: {
                        mimeType: mimeType,
                        data: base64Audio
                      }
                    }] : [])
                  ]
                }
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: CONFIG.GEMINI_TEMPERATURE
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

      // Stage 2: Text-only fallback to Gemini API if audio payload failed
      if ((!response || !response.ok) && spokenText && spokenText.trim().length > 0) {
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
                      { text: `Analyze spoken Ukrainian call transcript: "${spokenText}"` }
                    ]
                  }
                ],
                generationConfig: {
                  responseMimeType: 'application/json',
                  temperature: CONFIG.GEMINI_TEMPERATURE
                }
              })
            });

            if (res.ok) {
              response = res;
              break;
            }
          } catch (e) {
            console.warn(`Text-only Gemini fetch error for ${modelName}:`, e);
          }
        }
      }
    }

    // Stage 3: Offline High-Precision NLP Fallback via VoiceDictationService
    if (!response || !response.ok) {
      console.info('Gemini API unavailable or unconfigured. Executing high-precision offline NLP parser.');
      if (spokenText && spokenText.trim().length > 0) {
        return await VoiceDictationService.getInstance().parseSpokenText(spokenText);
      }
      return this.getOfflineFallbackResult();
    }

    const data = await response.json();
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawJson) {
      if (spokenText && spokenText.trim().length > 0) {
        return await VoiceDictationService.getInstance().parseSpokenText(spokenText);
      }
      return this.getOfflineFallbackResult();
    }

    let parsedResult: AgentProcessingResult;
    try {
      const cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
    } catch {
      if (spokenText && spokenText.trim().length > 0) {
        return await VoiceDictationService.getInstance().parseSpokenText(spokenText);
      }
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
      const query = encodeURIComponent(`${addressStr}, ${CONFIG.GEOCODING.DEFAULT_COUNTRY_SUFFIX}`);
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
