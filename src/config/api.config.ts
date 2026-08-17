/**
 * External API Paths and Endpoint Constants
 */
export const apiConfig = {
  FORLAND: {
    LOGIN_PATH: '/Account/login',
    LOGOUT_PATH: '/Account/logout',
    REPOSITORY_PATH: '/Meta/GetRepository',
    GET_LIST_PATH: '/DataExchange/GetList',
    CREATE_NEW_UNIT_PATH: '/Unit/CreateNewUnit',
    SAVE_PATH: '/Unit/Save'
  },
  GEMINI: {
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
    RATE_LIMIT_STATUS: 429,
    MIN_AUDIO_BASE64_LENGTH: 50,
    JSON_FENCE_PATTERNS: [/```json/g, /```/g]
  }
} as const;
