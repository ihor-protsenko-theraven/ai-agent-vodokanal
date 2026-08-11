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
  SHORT_SPEECH_THRESHOLD: 15,
  CONFIDENCE_SCORES: {
    SPEECH_DEFAULT: 0.96,
    SPEECH_SHORT: 0.85,
    CLASSIFICATION_DEFAULT: 0.94,
    ADDRESS_FULL: 0.92,
    ADDRESS_STREET_ONLY: 0.78,
    ADDRESS_LOW: 0.62,
    ADDRESS_VAGUE: 0.62,
    GEOCODING_FULL: 0.88,
    GEOCODING_FALLBACK: 0.70,
    GEOCODING_VAGUE: 0.54
  },

  SCENARIOS: {
    LOW_CONFIDENCE: 'low-confidence',
    DUPLICATES_FOUND: 'duplicates-found',
    NO_REGISTRATION: 'no-registration',
    HIGH_CONFIDENCE: 'high-confidence',
    REAL_AUDIO: 'real-audio'
  },

  PROMPTS: {
    SYSTEM: `You are an expert AI dispatcher for a water utility company.
Analyze the user's spoken or textual report about a water infrastructure incident.

Follow these rules carefully:
1. appealType MUST be one of: "Витік води", "Провал", "Низький тиск води", "Відсутність Води", "Брудна вода", "Закупорка", "Витік на каналізації", "Відкритий колодязь", "Пошкоджена кришка колодязя", "Несправність засувки", "Планові роботи", "Встановлення лічильника", "Благоустрій", "Заміна трубопроводу", "Консультація / Тарифи". Do NOT invent other values.
2. ticketType MUST be EXACTLY one of these three values: "Аварійні роботи", "Планові роботи", "Благоустрій". Do NOT invent other values. Classify strictly by the nature of the report:
   - "Аварійні роботи" (emergency works): urgent/emergency incidents — pipe burst, active water leak, sudden loss of water supply, sewage blockage or flooding, any immediate danger or damage. Keywords: "порив", "прорвало", "витік", "тече", "немає води", "відключили воду", "аварія", "терміново", "засмічення", "підтоплення".
   - "Планові роботи" (planned works): scheduled activities — planned maintenance or repairs, planned water shutdown per schedule, replacement of pipes/equipment/meters, inspections, and informational/consultation requests (e.g. tariffs). Keywords: "плановий ремонт", "планові роботи", "профілактика", "за графіком", "відключення по графіку", "заміна", "регламент".
   - "Благоустрій" (landscaping/improvement): infrastructure appearance and safety issues — damaged or missing manhole cover, open manhole, pothole/hole, damaged sidewalk or road surface near water infrastructure, restoration of coverage. Keywords: "люк", "кришка", "колодязь", "яма", "тротуар", "благоустрій", "відновлення покриття", "асфальт".
3. applicantName: Extract the actual human name (e.g. "Антон", "Олена"). Do NOT extract pronouns like "Мене", "Я". If no name is provided, leave blank.
4. phoneNumber: Extract the spoken phone number and format it strictly as a single string of digits, optionally starting with '+' (e.g. "+380992477200"). Do NOT hallucinate a default number.
5. applicantAddress / addressText: Extract the real city and street. Remove filler words like "на вулиці" or "вулиці". Format it cleanly (e.g., "м. Дніпро, вул. Берестейська, 27").
6. notes: Include the raw text of the user's report, prefixed with "Надиктовано оператором: ".

Extract the relevant fields and return ONLY a valid JSON object strictly matching this schema:
{
  "ticket": {
    "appealType": "string",
    "ticketType": "string (one of: 'Аварійні роботи', 'Планові роботи', 'Благоустрій')",
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
