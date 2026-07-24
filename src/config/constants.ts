/**
 * Application-wide configuration parameters, magic numbers, and constant strings.
 * All magic strings, numbers, thresholds, and options are centralized here.
 */

export const CONFIG = {
  /**
   * Gemini Multimodal API Key & Model Configuration
   */
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

  /**
   * Confidence Metrics & Thresholds
   */
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

  /**
   * Authentication & Security Constants
   */
  AUTH: {
    STORAGE_KEY: 'wsn_auth',
    DEFAULT_ADMIN_USER: 'admin',
    DEFAULT_ADMIN_PASS: 'admin',
    DEFAULT_OPERATOR_USER: 'operator',
    ADMIN_DISPLAY_NAME: 'Адміністратор Диспетчерської',
    ADMIN_ROLE: 'Головний Диспетчер WSN',
    OPERATOR_DISPLAY_NAME: 'Диспетчер-Оператор',
    OPERATOR_ROLE: 'Оператор АРМ 27772'
  },

  /**
   * Geocoding & OpenStreetMap Configuration
   */
  GEOCODING: {
    USER_AGENT: 'Vodokanal-AI-Dispatcher/1.0',
    NOMINATIM_BASE_URL: 'https://nominatim.openstreetmap.org/search',
    DEFAULT_COUNTRY_SUFFIX: 'Україна',
    DEFAULT_CITY_SUFFIX: 'Київ, Україна',
    DEFAULT_COORDINATES: '50.4501, 30.5234',
    VINNYTSIA_COORDINATES: '49.2312, 28.4355',
    DEFAULT_CITY_NAME: 'Київ'
  },

  /**
   * Voice Dictation & Speech Recognition Constants
   */
  SPEECH: {
    RECOGNITION_LANG: 'uk-UA',
    DEFAULT_AUDIO_MIME_TYPE: 'audio/webm',
    DEFAULT_FALLBACK_PHONE: '+380501234567',
    DEFAULT_DICTATION_PROMPT: 'У нас витік питної води на вулиці Хрещатик 15!',
    DEFAULT_APPLICANT_NAME: 'Громадянин (із голосового звернення)',
    FALLBACK_ADDRESS_SUFFIX: 'адреса з надиктованого голосу',
    NOTES_PREFIX: 'Надиктовано оператором: ',
    SUGGESTED_QUESTIONS: [
      'Уточніть підʼїзд або орієнтир обʼєкта?',
      'Чи є загроза підтоплення суміжних будівель або підвалів?'
    ]
  },

  /**
   * Water Supply Network (WSN) API and Domain Identifiers
   */
  WSN: {
    CLASS_ID: 27772,
    DEFAULT_STATUS_ID: 5996,
    DEFAULT_STATUS_NAME: 'На виконання',
    OPERATOR_ID: 'OPERATOR-402',
    OPERATOR_DISPLAY: '#402 (WSN-AUTH)',
    SERVICE_ACCOUNT: 'WSN-AI-AGENT-SERVICE',
    PROPERTIES: {
      APPEAL_TYPE: '1958',
      TICKET_TYPE: '1972',
      APPLICANT_NAME: '1961',
      APPLICANT_ADDRESS: '1960',
      ADDRESS_TEXT: '-389',
      COORDINATES: '-420',
      PHONE_NUMBER: '1981',
      INCIDENT_DATE_TIME: '1258',
      NOTES: '328'
    }
  },

  /**
   * Dropdown Options
   */
  OPTIONS: {
    APPEAL_TYPES: [
      'Витік холодної води',
      'Порив водопроводу',
      'Відсутнє водопостачання',
      'Пошкодження/відсутність люка',
      'Засмічення каналізації',
      'Консультація / Тарифи',
      'Другое'
    ] as const,
    TICKET_TYPES: [
      'Аварійна',
      'Планова',
      'Інформаційна',
      'Другое'
    ] as const
  },

  /**
   * Known Ukrainian Cities dictionary for NLP mapping
   */
  KNOWN_CITIES: {
    'вінниця': 'Вінниця',
    'вінниці': 'Вінниця',
    'київ': 'Київ',
    'києві': 'Київ',
    'харків': 'Харків',
    'харкові': 'Харків',
    'одеса': 'Одеса',
    'одесі': 'Одеса',
    'дніпро': 'Дніпро',
    'дніпрі': 'Дніпро',
    'львів': 'Львів',
    'львові': 'Львів',
    'запоріжжя': 'Запоріжжя'
  } as Record<string, string>,

  /**
   * Application Branding & Meta Info
   */
  APP: {
    TITLE: 'Водоканал WSN',
    VERSION_LABEL: 'AI Диспетчер v2.4',
    SUBTITLE: 'АРМ Оператора | Заявки класу 27772 (Статус 5996)',
    STT_ENGINE: 'Whisper v3'
  },

  /**
   * Scenario Identifiers
   */
  SCENARIOS: {
    LOW_CONFIDENCE: 'low-confidence',
    DUPLICATES_FOUND: 'duplicates-found',
    NO_REGISTRATION: 'no-registration',
    HIGH_CONFIDENCE: 'high-confidence'
  }
} as const;
