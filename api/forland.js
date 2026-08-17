const TARGET = 'https://wsn1.forland-solution.com';
const PREFIX = '/api/forland';
const ALLOWED_PATHS = new Set([
  '/Account/login',
  '/Account/logout',
  '/Meta/GetRepository',
  '/DataExchange/GetList',
  '/Unit/CreateNewUnit',
  '/Unit/Save'
]);

const STRIP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'accept-encoding',
  'content-length'
]);

function rewriteSetCookie(cookie) {
  return cookie
    .replace(/;\s*Domain=[^;]*/gi, '')
    .replace(/;\s*Path=[^;]*/gi, '; Path=/')
    .replace(/;\s*SameSite=Lax/gi, '; SameSite=None')
    .replace(/;\s*SameSite=Strict/gi, '; SameSite=None')
    .replace(/;\s*Secure/gi, '; Secure');
}

export default async function handler(req, res) {
  const path = req.url.replace(new RegExp('^' + PREFIX), '') || '/';
  const pathname = path.split('?')[0];

  if (!ALLOWED_PATHS.has(pathname)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Forland route is not allowed' }));
    return;
  }

  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (STRIP_HEADERS.has(key.toLowerCase())) continue;
    headers[key] = value;
  }

  const init = { method: req.method, headers, redirect: 'manual' };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    init.body = Buffer.concat(chunks);
  }

  try {
    const upstream = await fetch(TARGET + path, init);

    res.statusCode = upstream.status;

    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (STRIP_HEADERS.has(lower)) return;

      if (lower === 'set-cookie') {
        const cookies = upstream.headers.getSetCookie
          ? upstream.headers.getSetCookie()
          : [value];
        res.setHeader('Set-Cookie', cookies.map(rewriteSetCookie));
        return;
      }

      res.setHeader(key, value);
    });

    const body = await upstream.arrayBuffer();
    res.end(Buffer.from(body));
  } catch (error) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Forland proxy error', message: error.message }));
  }
}
