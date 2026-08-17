
import { AgentProcessingResult } from '../types/ticket';
import { GeminiContentPart, GeminiResponse } from '../types/gemini';
import { aiConfig, apiConfig, geoConfig, speechConfig, wsnConfig } from '../config';
import { SCENARIO_HIGH_CONFIDENCE, SCENARIO_DUPLICATE_FOUND, SCENARIO_LOW_CONFIDENCE } from '../mock/mockData';
import { VoiceDictationService } from './VoiceDictationService';
import { geocodingService } from './GeocodingService';
import { AppealTypeClassifier } from './nlp/AppealTypeClassifier';
import { ApplicantNameExtractor } from './nlp/ApplicantNameExtractor';
import { PhoneExtractor } from './nlp/PhoneExtractor';
import { UkrainianAddressParser } from './nlp/UkrainianAddressParser';

export class GeminiService {
  private static instance: GeminiService;
  private fallbackCounter: number = 0;

  private appealTypeClassifier = new AppealTypeClassifier();
  private nameExtractor = new ApplicantNameExtractor();
  private phoneExtractor = new PhoneExtractor();
  private addressParser = new UkrainianAddressParser();

  private constructor() {}

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  public async processAudio(audioBlob: Blob, spokenText?: string): Promise<AgentProcessingResult> {
    if (aiConfig.MODE === 'local') {
      console.info('[Local AI] Gemini API is disabled; using the local parser or mock data.');
      return this.executeLocalFallback(spokenText);
    }

    const hasText = Boolean(spokenText?.trim());
    const hasAudio = audioBlob.size > 0;

    let rawJson: string | null = null;

    // Scenario 1: Multimodal (Audio + Text) through the server-side proxy.
    // The Gemini API key must never be present in a browser bundle.
    if (hasAudio) {
      rawJson = await this.executeGeminiChain(await this.buildMultimodalPayload(audioBlob, spokenText));
    }

    // Scenario 2: Text-only fallback
    if (!rawJson && hasText) {
      console.warn('[Gemini] Switching to text-only fallback chain.');
      rawJson = await this.executeGeminiChain(this.buildTextPayload(spokenText!));
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
  private async executeGeminiChain(parts: GeminiContentPart[]): Promise<string | null> {
    const candidateModels = Array.from(new Set([aiConfig.GEMINI_MODEL, ...aiConfig.GEMINI_CANDIDATE_MODELS]));

    for (const modelName of candidateModels) {
      try {
        const res = await fetch(apiConfig.GEMINI.PROXY_PATH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelName,
            parts
          })
        });

        if (res.ok) {
          const data = (await res.json()) as GeminiResponse;
          return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        }

        if (res.status === apiConfig.GEMINI.RATE_LIMIT_STATUS) {
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

  private async buildMultimodalPayload(audioBlob: Blob, spokenText?: string): Promise<GeminiContentPart[]> {
    const base64Audio = await this.blobToBase64(audioBlob);
    const mimeType = audioBlob.type || speechConfig.DEFAULT_AUDIO_MIME_TYPE;
    const parts: GeminiContentPart[] = [{ text: aiConfig.PROMPTS.SYSTEM }];

    if (spokenText?.trim()) {
      parts.push({ text: `Spoken Text Transcript: "${spokenText}"` });
    }

    if (base64Audio.length > apiConfig.GEMINI.MIN_AUDIO_BASE64_LENGTH) {
      parts.push({
        inlineData: { mimeType, data: base64Audio }
      });
    }

    return parts;
  }

  private buildTextPayload(spokenText: string): GeminiContentPart[] {
    return [
      { text: aiConfig.PROMPTS.SYSTEM },
      { text: `Analyze spoken Ukrainian call transcript: "${spokenText}"` }
    ];
  }

  private async executeLocalFallback(spokenText?: string): Promise<AgentProcessingResult> {
    console.info('[Fallback] Executing local NLP parser or mock data.');
    if (spokenText?.trim()) {
      return await VoiceDictationService.getInstance().parseSpokenText(spokenText);
    }
    return this.getMockFallbackResult();
  }

  private async parseAndEnrichResult(rawJson: string, spokenText?: string): Promise<AgentProcessingResult> {
    let parsedResult: AgentProcessingResult;

    try {
      let cleanJson = rawJson;
      for (const pattern of apiConfig.GEMINI.JSON_FENCE_PATTERNS) {
        cleanJson = cleanJson.replace(pattern, '');
      }
      cleanJson = cleanJson.trim();
      parsedResult = JSON.parse(cleanJson) as AgentProcessingResult;

      // Basic structure validation
      if (!parsedResult || !parsedResult.ticket) {
        throw new Error('Invalid JSON structure returned from Gemini');
      }
    } catch (e) {
      console.warn('[Gemini] JSON Parse error, falling back.', e);
      return this.executeLocalFallback(spokenText);
    }

    const ticket = parsedResult.ticket;

    // Deterministic corrections over the LLM output: keep values in sync with
    // the actual dropdowns and fix name / phone / address using local extractors.
    const spoken = (spokenText || '').trim();
    if (spoken) {
      const lower = spoken.toLowerCase();
      const validAppealTypes: string[] = [...wsnConfig.OPTIONS.APPEAL_TYPES, wsnConfig.CONSULTATION_APPEAL_TYPE];
      if (ticket.appealType && !validAppealTypes.includes(ticket.appealType)) {
        ticket.appealType = this.appealTypeClassifier.detectAppealType(lower);
      }
      if (ticket.ticketType && !(wsnConfig.OPTIONS.TICKET_TYPES as readonly string[]).includes(ticket.ticketType)) {
        ticket.ticketType = this.appealTypeClassifier.classifyTicketType(lower);
      }

      const name = this.nameExtractor.extract(spoken);
      if (name !== speechConfig.DEFAULT_APPLICANT_NAME) {
        ticket.applicantName = name;
      }

      const phone = this.phoneExtractor.extract(spoken);
      if (phone) {
        ticket.phoneNumber = phone;
      }

      const parsedAddress = this.addressParser.parse(spoken);
      if (parsedAddress.hasStreet) {
        ticket.addressText = parsedAddress.fullAddress;
        ticket.applicantAddress = parsedAddress.fullAddress;
      }
    }

    const hasNoCoords = !ticket.coordinates || !ticket.coordinates.trim();

    if (ticket.addressText && hasNoCoords) {
      const coords = await geocodingService.getCoordinates(ticket.addressText);
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
    return JSON.parse(JSON.stringify(selected)) as AgentProcessingResult;
  }

  private blobToBase64(blob: Blob): Promise<string> {
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
