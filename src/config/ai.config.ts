/**
 * AI System Prompts, Models and Constants
 */
export const aiConfig = {
  GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || '',
  GEMINI_MODEL: 'gemini-1.5-flash-latest',
  GEMINI_TEMPERATURE: 0.1,
  GEMINI_CANDIDATE_MODELS: [
    'gemini-1.5-flash-latest',
    'gemini-2.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash-8b'
  ] as const,

  CONFIDENCE_THRESHOLD: 0.7,
  HIGH_CONFIDENCE_THRESHOLD: 0.85,
  CONFIDENCE_SCORES: {
    SPEECH_DEFAULT: 0.96,
    SPEECH_SHORT: 0.85,
    CLASSIFICATION_DEFAULT: 0.94,
    ADDRESS_FULL: 0.92,
    ADDRESS_STREET_ONLY: 0.78,
    ADDRESS_LOW: 0.62,
    GEOCODING_FULL: 0.88,
    GEOCODING_FALLBACK: 0.70
  },

  SCENARIOS: {
    LOW_CONFIDENCE: 'low-confidence',
    DUPLICATES_FOUND: 'duplicates-found',
    NO_REGISTRATION: 'no-registration',
    HIGH_CONFIDENCE: 'high-confidence'
  },

  PROMPTS: {
    SYSTEM: `You are an expert AI dispatcher for a water utility company.
Analyze the user's spoken or textual report about a water infrastructure incident.

Follow these rules carefully:
1. appealType MUST be one of: "Витік холодної води", "Порив водопроводу", "Відсутнє водопостачання", "Пошкодження/відсутність люка", "Засмічення каналізації", "Консультація / Тарифи", "Інше". (If it's a burst hot water pipe, use "Порив водопроводу").
2. applicantName: Extract the actual human name (e.g. "Антон", "Олена"). Do NOT extract pronouns like "Мене", "Я". If no name is provided, leave blank.
3. phoneNumber: Extract the spoken phone number and format it strictly as a single string of digits, optionally starting with '+' (e.g. "+380992477200"). Do NOT hallucinate a default number.
4. applicantAddress / addressText: Extract the real city and street. Remove filler words like "на вулиці" or "вулиці". Format it cleanly (e.g., "м. Дніпро, вул. Берестейська, 27").
5. notes: Include the raw text of the user's report, prefixed with "Надиктовано оператором: ".

Extract the relevant fields and return ONLY a valid JSON object strictly matching this schema:
{
  "ticket": {
    "appealType": "string",
    "ticketType": "string (e.g. 'Аварійна')",
    "applicantName": "string",
    "applicantAddress": "string",
    "addressText": "string",
    "coordinates": "string",
    "phoneNumber": "string",
    "incidentDateTime": "string (ISO 8601)",
    "notes": "string"
  },
  "confidence": {
    "speechRecognition": number (0 to 1),
    "classification": number (0 to 1),
    "addressExtraction": number (0 to 1),
    "geocoding": number (0 to 1)
  },
  "requiresManualReview": boolean,
  "requiresTicketRegistration": boolean,
  "suggestedQuestions": ["string"],
  "duplicatesFound": []
}`
  }
} as const;
