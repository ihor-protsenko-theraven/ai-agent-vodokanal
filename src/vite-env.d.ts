/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_MODE?: 'local' | 'gemini';
  readonly VITE_FORLAND_PROXY_MODE?: 'vite' | 'vercel';
}

declare const __BUILD_INFO__: import('@/shared/config/buildInfo').BuildInfo;
