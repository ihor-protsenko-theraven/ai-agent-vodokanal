const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const ALLOWED_MODELS = new Set([
  'gemini-1.5-flash-latest',
  'gemini-2.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash-8b'
]);
const MAX_REQUEST_BYTES = 4 * 1024 * 1024;

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function isGeminiPart(part) {
  if (!part || typeof part !== 'object') return false;
  if (typeof part.text === 'string') return part.text.length <= 50_000;

  const inlineData = part.inlineData;
  return Boolean(
    inlineData &&
    typeof inlineData === 'object' &&
    typeof inlineData.mimeType === 'string' &&
    inlineData.mimeType.startsWith('audio/') &&
    typeof inlineData.data === 'string'
  );
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_REQUEST_BYTES) {
      throw new RangeError('Request body is too large');
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw || '{}');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return sendJson(res, 503, { error: 'Gemini integration is not configured' });
  }

  const contentLength = Number(req.headers['content-length']);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return sendJson(res, 413, { error: 'Gemini request is too large' });
  }

  try {
    const { model, parts } = await readJsonBody(req);
    if (!ALLOWED_MODELS.has(model) || !Array.isArray(parts) || parts.length === 0 || !parts.every(isGeminiPart)) {
      return sendJson(res, 400, { error: 'Invalid Gemini request' });
    }

    const upstream = await fetch(
      `${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        })
      }
    );

    const responseBody = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    res.end(responseBody);
  } catch (error) {
    const status = error instanceof RangeError ? 413 : 400;
    sendJson(res, status, { error: status === 413 ? 'Gemini request is too large' : 'Invalid Gemini request' });
  }
}
