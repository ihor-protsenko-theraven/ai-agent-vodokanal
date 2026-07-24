/**
 * Application-wide configuration parameters, magic numbers, and constant strings.
 * All magic strings, numbers, thresholds, and options are centralized here.
 */

export const CONFIG = {
    /**
     * Gemini Multimodal API Key & Model Configuration
     */
    GEMINI_API_KEY: ((import.meta as unknown as {
        env?: Record<string, string>
    }).env?.VITE_GEMINI_API_KEY) || 'AIzaSyDhqKH8r50MppXM7QpSSCuVPWUCL-8Yfi4',
    GEMINI_MODEL: 'gemini-1.5-flash-latest',
    GEMINI_CANDIDATE_MODELS: [
        'gemini-1.5-flash-latest',
        'gemini-2.5-flash',
        'gemini-1.5-pro',
        'gemini-2.0-flash-exp',
        'gemini-1.5-flash-8b'
    ] as const,

    /**
     * Minimum confidence score required to auto-verify a field without operator review.
     */
    CONFIDENCE_THRESHOLD: 0.7,
    HIGH_CONFIDENCE_THRESHOLD: 0.85,

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
        DEFAULT_CITY_SUFFIX: 'Київ, Україна',
        DEFAULT_COORDINATES: '50.4501, 30.5234'
    },

    /**
     * Voice Dictation & Speech Recognition Constants
     */
    SPEECH: {
        RECOGNITION_LANG: 'uk-UA',
        DEFAULT_AUDIO_MIME_TYPE: 'audio/webm',
        DEFAULT_FALLBACK_PHONE: '+380501234567'
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
            'Інше'
        ] as const,
        TICKET_TYPES: [
            'Аварійна',
            'Планова',
            'Інформаційна',
            'Інше'
        ] as const
    },

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
