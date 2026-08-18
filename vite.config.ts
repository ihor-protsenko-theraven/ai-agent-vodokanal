import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

interface PackageManifest {
  version?: string;
}

function readFirstEnvironmentValue(...names: string[]): string | undefined {
  return names.map((name) => process.env[name]).find((value) => Boolean(value));
}

function getBuildInfo() {
  const packageManifest = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf8')
  ) as PackageManifest;
  const environment = readFirstEnvironmentValue('VERCEL_ENV', 'VITE_VERCEL_ENV') ?? 'local';
  const revision = readFirstEnvironmentValue(
    'VERCEL_GIT_COMMIT_SHA',
    'VITE_VERCEL_GIT_COMMIT_SHA',
    'GITHUB_SHA'
  ) ?? 'local';
  const deploymentId = readFirstEnvironmentValue('VERCEL_DEPLOYMENT_ID', 'VITE_VERCEL_DEPLOYMENT_ID');

  return {
    version: packageManifest.version ?? '0.0.0',
    revision: revision.slice(0, 7),
    environment: ['development', 'preview', 'production'].includes(environment) ? environment : 'local',
    deploymentId: deploymentId ?? null,
    builtAt: new Date().toISOString()
  };
}

export default defineConfig(() => ({
  define: {
    __BUILD_INFO__: JSON.stringify(getBuildInfo())
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/forland': {
        target: 'https://wsn1.forland-solution.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/forland/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            const setCookie = proxyRes.headers['set-cookie'];
            if (Array.isArray(setCookie)) {
              proxyRes.headers['set-cookie'] = setCookie.map((cookie) =>
                cookie.replace(/;\s*Secure/gi, '').replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
              );
            }
          });
        }
      }
    }
  }
}));
