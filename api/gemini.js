const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const ALLOWED_MODELS = new Set([
  // Keep in sync with aiConfig.GEMINI_MODEL and GEMINI_CANDIDATE_MODELS.
  // The Flash-Lite model is used only when the higher-quality models are
  // unavailable or their quota is exhausted.
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  // Accept the immediately preceding client chain during a rolling Vercel or
  // local-dev update. Static assets and serverless functions can temporarily
  // originate from different builds; this compatibility list prevents a 400
  // before the client has reloaded. New builds never select these models.
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite'
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

function getInvalidRequestReason(model, parts) {
  if (typeof model !== 'string') return 'missing_model';
  if (!ALLOWED_MODELS.has(model)) return 'model_not_allowed';
  if (!Array.isArray(parts) || parts.length === 0) return 'missing_parts';
  if (!parts.every(isGeminiPart)) return 'unsupported_part';
  return null;
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

  // GEMINI_API_KEY is the preferred server-only name. The VITE-prefixed value
  // is supported temporarily so existing Vercel Preview/Production settings
  // continue to work while the project configuration is migrated.
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return sendJson(res, 503, {
      error: 'Gemini integration is not configured',
      message: 'Missing GEMINI_API_KEY or legacy VITE_GEMINI_API_KEY for this environment'
    });
  }

  const contentLength = Number(req.headers['content-length']);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return sendJson(res, 413, { error: 'Gemini request is too large' });
  }

  let request;
  try {
    request = await readJsonBody(req);
  } catch (error) {
    const status = error instanceof RangeError ? 413 : 400;
    return sendJson(res, status, {
      error: status === 413 ? 'Gemini request is too large' : 'Invalid Gemini request',
      reason: status === 413 ? 'body_too_large' : 'invalid_json'
    });
  }

  const { model, parts } = request;
  const invalidRequestReason = getInvalidRequestReason(model, parts);
  if (invalidRequestReason) {
    return sendJson(res, 400, {
      error: 'Invalid Gemini request',
      reason: invalidRequestReason,
      ...(typeof model === 'string' ? { model } : {}),
      ...(invalidRequestReason === 'model_not_allowed' ? { allowedModels: [...ALLOWED_MODELS] } : {})
    });
  }

  try {
    const upstream = await fetch(
      `${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
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
    console.error('Gemini upstream request failed:', {
      model,
      message: error instanceof Error ? error.message : String(error)
    });
    sendJson(res, 502, {
      error: 'Gemini upstream is unavailable',
      reason: 'upstream_request_failed',
      model
    });
  }
}
