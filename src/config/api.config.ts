/**
 * External API Paths and Endpoint Constants
 */
export type ForlandProxyMode = 'vite' | 'vercel';

/**
 * Both Vite and `vercel dev` expose `import.meta.env.DEV === true`.
 * Route selection must therefore be explicit: Vite owns `/forland`, while
 * the Vercel function owns `/api/forland`.
 */
export function resolveForlandProxyBasePath(value: string | undefined, isDevelopment: boolean): string {
  if (value === 'vite') return '/forland';
  if (value === 'vercel') return '/api/forland';

  return isDevelopment ? '/forland' : '/api/forland';
}

export const apiConfig = {
  FORLAND: {
    PROXY_BASE_PATH: resolveForlandProxyBasePath(
      import.meta.env.VITE_FORLAND_PROXY_MODE,
      import.meta.env.DEV
    ),
    LOGIN_PATH: '/Account/login',
    LOGOUT_PATH: '/Account/logout',
    REPOSITORY_PATH: '/Meta/GetRepository',
    GET_LIST_PATH: '/DataExchange/GetList',
    CREATE_NEW_UNIT_PATH: '/Unit/CreateNewUnit',
    SAVE_PATH: '/Unit/Save'
  },
  GEMINI: {
    PROXY_PATH: '/api/gemini',
    RATE_LIMIT_STATUS: 429,
    MIN_AUDIO_BASE64_LENGTH: 50,
    JSON_FENCE_PATTERNS: [/```json/g, /```/g]
  }
} as const;
