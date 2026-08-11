import { AgentProcessingResult } from '../types/ticket';
import { aiConfig, geoConfig, nlpConfig, speechConfig, wsnConfig } from '../config';
import { geocodingService } from './GeocodingService';
import { AppealTypeClassifier } from './nlp/AppealTypeClassifier';
import { PhoneExtractor } from './nlp/PhoneExtractor';
import { ApplicantNameExtractor } from './nlp/ApplicantNameExtractor';
import { UkrainianAddressParser } from './nlp/UkrainianAddressParser';
import { QuestionGenerator } from './nlp/QuestionGenerator';
import { DuplicateFinder } from './DuplicateFinder';
import { formatDateTimeLocal, generateCallId } from '../utils/wsn';

/**
 * Orchestrates voice dictation: Web Speech API wiring plus Ukrainian NLP parsing.
 * Parsing logic is delegated to small single-responsibility collaborators.
 */
export class VoiceDictationService {
  private static instance: VoiceDictationService;
  private recognition: any = null;
  private currentTranscript: string = '';

  private appealTypeClassifier = new AppealTypeClassifier();
  private phoneExtractor = new PhoneExtractor();
  private nameExtractor = new ApplicantNameExtractor();
  private addressParser = new UkrainianAddressParser();
  private questionGenerator = new QuestionGenerator();
  private duplicateFinder = new DuplicateFinder();

  private constructor() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = speechConfig.RECOGNITION_LANG;

      // Always accumulate full speech transcript from index 0 across all result chunks
      this.recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          fullTranscript += event.results[i][0].transcript;
        }
        this.currentTranscript = fullTranscript;
      };
    }
  }

  public static getInstance(): VoiceDictationService {
    if (!VoiceDictationService.instance) {
      VoiceDictationService.instance = new VoiceDictationService();
    }
    return VoiceDictationService.instance;
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }

  public startListening(): void {
    this.currentTranscript = '';
    if (this.recognition) {
      try {
        this.recognition.start();
      } catch {
        // Recognition already started or busy
      }
    }
  }

  public stopListening(): string {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore stop error
      }
    }
    return this.currentTranscript;
  }

  /**
   * High-precision Ukrainian NLP parser supporting all 4 TЗ scenarios from public/assets/scenarios:
   * 1. High Confidence Emergency Leak (scenario1_leak)
   * 2. Active Duplicate Check (scenario2_duplicate)
   * 3. Unclear Location / Low Confidence Review (scenario3_unclear_manhole)
   * 4. Tariff Consultation / No Crew Registration (scenario4_tariff_consultation)
   */
  public async parseSpokenText(spokenText: string): Promise<AgentProcessingResult> {
    const text = spokenText.trim() || speechConfig.DEFAULT_DICTATION_PROMPT;
    const lower = text.toLowerCase();

    // 1. Detect Appeal Type and Ticket Type
    const appealType = this.appealTypeClassifier.detectAppealType(lower);
    const isConsultation = this.appealTypeClassifier.isConsultation(appealType);
    const ticketType = isConsultation
      ? wsnConfig.OPTIONS.TICKET_TYPES[1]
      : this.appealTypeClassifier.classifyTicketType(lower);
    const requiresTicketRegistration = !isConsultation;

    // 2. Extract phone, name and address
    const phoneNumber = this.phoneExtractor.extract(text);
    const applicantName = this.nameExtractor.extract(text);
    const extractedAddress = this.addressParser.parse(text);
    let addressText = extractedAddress.fullAddress;
    const detectedCity = extractedAddress.city;

    // Scenario 3: Handle Unclear / Vague Address (e.g. "Борщагівка, біля бару чи аптеки, точну адресу не знаю")
    const isVagueLocation = nlpConfig.VAGUE_LOCATION_KEYWORDS.some((keyword) => lower.includes(keyword));
    if (isVagueLocation) {
      addressText = nlpConfig.VAGUE_ADDRESS_TEMPLATE(detectedCity);
    }

    // 3. Automated Geocoding via Geodata.online API (with Nominatim as fallback)
    let coordinates = '';
    if (addressText && !addressText.includes(speechConfig.FALLBACK_ADDRESS_SUFFIX) && !isVagueLocation) {
      coordinates = (await geocodingService.getCoordinates(addressText)) ?? '';
    }

    if (!coordinates) {
      coordinates =
        detectedCity === geoConfig.VINNYTSIA_CITY_NAME
          ? geoConfig.VINNYTSIA_COORDINATES
          : geoConfig.DEFAULT_COORDINATES;
    }

    // 4. Calculate Confidence Scores & Manual Review Status (Scenario 3: Unclear Location -> Low Confidence)
    const hasValidAddress = extractedAddress.hasStreet && extractedAddress.hasHouseNumber && !isVagueLocation;
    const addressConfidence = isVagueLocation
      ? aiConfig.CONFIDENCE_SCORES.ADDRESS_VAGUE
      : hasValidAddress
      ? aiConfig.CONFIDENCE_SCORES.ADDRESS_FULL
      : extractedAddress.hasStreet
      ? aiConfig.CONFIDENCE_SCORES.ADDRESS_STREET_ONLY
      : aiConfig.CONFIDENCE_SCORES.ADDRESS_LOW;

    const geoConfidence = isVagueLocation
      ? aiConfig.CONFIDENCE_SCORES.GEOCODING_VAGUE
      : coordinates && coordinates !== geoConfig.DEFAULT_COORDINATES
      ? aiConfig.CONFIDENCE_SCORES.GEOCODING_FULL
      : aiConfig.CONFIDENCE_SCORES.GEOCODING_FALLBACK;

    const speechConfidence = text.length > aiConfig.SHORT_SPEECH_THRESHOLD
      ? aiConfig.CONFIDENCE_SCORES.SPEECH_DEFAULT
      : aiConfig.CONFIDENCE_SCORES.SPEECH_SHORT;

    const classificationConfidence = aiConfig.CONFIDENCE_SCORES.CLASSIFICATION_DEFAULT;

    // Trigger manual review flag if address or geocoding confidence < threshold
    const requiresManualReview =
      addressConfidence < aiConfig.CONFIDENCE_THRESHOLD || geoConfidence < aiConfig.CONFIDENCE_THRESHOLD;

    // 5. Scenario 2: Automated Duplicate Ticket Detection (matching active tickets on Khreshchatyk / repeats)
    const duplicatesFound = this.duplicateFinder.find({ addressText, searchText: lower, appealType });

    // 6. Generate Contextual Suggested Questions
    const suggestedQuestions = this.questionGenerator.generate(appealType);

    return {
      callId: generateCallId(nlpConfig.CALL_ID_PREFIX),
      transcript: nlpConfig.TRANSCRIPT_TEMPLATE(text),
      requiresTicketRegistration,
      ticket: {
        appealType,
        ticketType,
        applicantName,
        applicantAddress: isConsultation ? nlpConfig.CONSULTATION_ADDRESS_LABEL : addressText,
        addressText: isConsultation ? nlpConfig.CONSULTATION_ADDRESS_LABEL : addressText,
        coordinates: isConsultation ? '' : coordinates,
        phoneNumber,
        incidentDateTime: formatDateTimeLocal(new Date()),
        notes: `${speechConfig.NOTES_PREFIX}${text}`
      },
      confidence: {
        speechRecognition: speechConfidence,
        classification: classificationConfidence,
        addressExtraction: addressConfidence,
        geocoding: geoConfidence
      },
      requiresManualReview,
      suggestedQuestions,
      duplicatesFound
    };
  }
}
