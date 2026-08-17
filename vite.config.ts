import { defineConfig } from 'vite';

export default defineConfig({
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
});
