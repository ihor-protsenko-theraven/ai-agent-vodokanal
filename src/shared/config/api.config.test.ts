import { describe, expect, it } from 'vitest';
import { resolveForlandProxyBasePath } from './api.config';

describe('Forland proxy route', () => {
  it('uses the Vite proxy by default only in a Vite development server', () => {
    expect(resolveForlandProxyBasePath(undefined, true)).toBe('/forland');
    expect(resolveForlandProxyBasePath('vite', true)).toBe('/forland');
  });

  it('uses the Vercel function in production and when explicitly requested locally', () => {
    expect(resolveForlandProxyBasePath(undefined, false)).toBe('/api/forland');
    expect(resolveForlandProxyBasePath('vercel', true)).toBe('/api/forland');
  });
});
