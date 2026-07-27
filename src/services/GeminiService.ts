
import { AgentProcessingResult } from '../types/ticket';
import { aiConfig, geoConfig, speechConfig } from '../config';
import { SCENARIO_HIGH_CONFIDENCE, SCENARIO_DUPLICATE_FOUND, SCENARIO_LOW_CONFIDENCE } from '../mock/mockData';
import { VoiceDictationService } from './VoiceDictationService';

class GeoCodingService {
  public static async getCoordinates(addressStr: string): Promise<string | null> {
    if (!addressStr) return null;
    
    try {
      const query = encodeURIComponent(`${ addressStr }, ${ geoConfig.DEFAULT_COUNTRY_SUFFIX } `);
      const url = `${ geoConfig.NOMINATIM_BASE_URL }?q = ${ query }& format=json & limit=1`;
      
      const res = await fetch(url, {
        headers: { 'User-Agent': geoConfig.USER_AGENT }
      });
      
      if (!res.ok) return null;
      
      const items = await res.json();
      if (items?.length > 0) {
        return `${ parseFloat(items[0].lat).toFixed(4) }, ${ parseFloat(items[0].lon).toFixed(4) } `;
      }
    } catch (e) {
      console.warn('[GeoCoding] Failed to geocode address:', e);
    }
    return null;
  }
}

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

  public async processAudio(audioBlob: Blob, spokenText?: string): Promise<AgentProcessingResult> {
    const hasText = Boolean(spokenText?.trim());
    const hasAudio = audioBlob.size > 0; 
    
    let rawJson: string | null = null;

    if (aiConfig.GEMINI_API_KEY) {
      // Scenario 1: Multimodal (Audio + Text)
      if (hasAudio) {
        rawJson = await this.executeGeminiChain(await this.buildMultimodalPayload(audioBlob, spokenText));
      }
      
      // Scenario 2: Text-only fallback
      if (!rawJson && hasText) {
        console.warn('[Gemini] Switching to text-only fallback chain.');
        rawJson = await this.executeGeminiChain(this.buildTextPayload(spokenText!));
      }
    }

    // Scenario 3: Local parsing fallback
    if (!rawJson) {
      return this.executeLocalFallback(spokenText);
    }

    // Scenario 4: Parse result and enrich with Geocoding
    return this.parseAndEnrichResult(rawJson, spokenText);
  }

  /**
   * Universal executor that iterates through candidate models and handles 429 rate limits
   */
  private async executeGeminiChain(parts: any[]): Promise<string | null> {
    const candidateModels = Array.from(new Set([aiConfig.GEMINI_MODEL, ...aiConfig.GEMINI_CANDIDATE_MODELS]));

    for (const modelName of candidateModels) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${aiConfig.GEMINI_API_KEY}`;

const res = await fetch(apiUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: aiConfig.GEMINI_TEMPERATURE
    }
  })
});

if (res.ok) {
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

if (res.status === 429) {
  console.warn(`[429 Rate Limit] Model ${modelName} throttled. Falling back to next.`);
  continue;
}

console.warn(`[Gemini] Model ${modelName} returned status ${res.status}`);
      } catch (e) {
  console.warn(`[Gemini] Fetch error for ${modelName}:`, e);
}
    }

return null;
  }

  private async buildMultimodalPayload(audioBlob: Blob, spokenText ?: string): Promise < any[] > {
  const base64Audio = await this.blobToBase64(audioBlob);
  const mimeType = audioBlob.type || speechConfig.DEFAULT_AUDIO_MIME_TYPE;
  const parts: any[] = [{ text: aiConfig.PROMPTS.SYSTEM }];

  if(spokenText?.trim()) {
  parts.push({ text: `Spoken Text Transcript: "${spokenText}"` });
}

if (base64Audio.length > 50) {
  parts.push({
    inlineData: { mimeType, data: base64Audio }
  });
}
return parts;
  }

  private buildTextPayload(spokenText: string): any[] {
  return [
    { text: aiConfig.PROMPTS.SYSTEM },
    { text: `Analyze spoken Ukrainian call transcript: "${spokenText}"` }
  ];
}

  private async executeLocalFallback(spokenText ?: string): Promise < AgentProcessingResult > {
  console.info('[Fallback] Executing local NLP parser or mock data.');
  if(spokenText?.trim()) {
  return await VoiceDictationService.getInstance().parseSpokenText(spokenText);
}
return this.getMockFallbackResult();
  }

  private async parseAndEnrichResult(rawJson: string, spokenText ?: string): Promise < AgentProcessingResult > {
  let parsedResult: AgentProcessingResult;

  try {
    const cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    parsedResult = JSON.parse(cleanJson);

    // Basic structure validation
    if(!parsedResult || !parsedResult.ticket) {
  throw new Error("Invalid JSON structure returned from Gemini");
}
    } catch (e) {
  console.warn('[Gemini] JSON Parse error, falling back.', e);
  return this.executeLocalFallback(spokenText);
}

const ticket = parsedResult.ticket;
const hasNoCoords = !ticket.coordinates || !ticket.coordinates.trim();

if (ticket.addressText && hasNoCoords) {
  const coords = await GeoCodingService.getCoordinates(ticket.addressText);
  if (coords) {
    ticket.coordinates = coords;

    // Safeguard for confidence object
    parsedResult.confidence = parsedResult.confidence || { geocoding: 0 };
    parsedResult.confidence.geocoding = Math.max(
      parsedResult.confidence.geocoding,
      aiConfig.HIGH_CONFIDENCE_THRESHOLD
    );
  }
}

// Default coordinates for mandatory registration
if (parsedResult.requiresTicketRegistration && (!ticket.coordinates || !ticket.coordinates.trim())) {
  ticket.coordinates = geoConfig.DEFAULT_COORDINATES;
}

parsedResult.duplicatesFound = parsedResult.duplicatesFound || [];
return parsedResult;
  }

  private getMockFallbackResult(): AgentProcessingResult {
  const scenarios = [SCENARIO_HIGH_CONFIDENCE, SCENARIO_DUPLICATE_FOUND, SCENARIO_LOW_CONFIDENCE];
  const selected = scenarios[this.fallbackCounter % scenarios.length];
  this.fallbackCounter++;
  return JSON.parse(JSON.stringify(selected));
}

  private blobToBase64(blob: Blob): Promise < string > {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
}