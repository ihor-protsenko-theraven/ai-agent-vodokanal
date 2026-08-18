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

const DEFAULT_TICKET_CATALOG = {
  appealTypes: ['Витік води', 'Провал', 'Низький тиск води', 'Відсутність Води', 'Брудна вода', 'Закупорка', 'Витік каналізації', 'Відкритий колодязь', 'Пошкоджена кришка колодязя', 'Несправність засувки', 'Планові роботи', 'Встановлення лічильника', 'Благоустрій', 'Заміна трубопроводу', 'Консультація / Тарифи'],
  ticketTypes: ['Аварійні роботи', 'Планові роботи', 'Благоустрій']
};

// Keep this schema compact: Gemini supports a JSON Schema subset, and the
// client still validates every value at runtime before it reaches the form.
function createTicketDraftSchema(catalog) {
  return {
  type: 'object',
  properties: {
    ticket: {
      type: 'object',
      properties: {
        appealType: { type: 'string', enum: catalog.appealTypes },
        ticketType: { type: 'string', enum: catalog.ticketTypes },
        applicantName: { type: 'string' },
        applicantAddress: { type: 'string' },
        addressText: { type: 'string' },
        coordinates: { type: 'string' },
        phoneNumber: { type: 'string' },
        incidentDateTime: { type: 'string' },
        notes: { type: 'string' }
      },
      required: ['appealType', 'ticketType', 'applicantName', 'applicantAddress', 'addressText', 'coordinates', 'phoneNumber', 'incidentDateTime', 'notes'],
      additionalProperties: false
    },
    confidence: {
      type: 'object',
      properties: {
        speechRecognition: { type: 'number', minimum: 0, maximum: 1 },
        classification: { type: 'number', minimum: 0, maximum: 1 },
        addressExtraction: { type: 'number', minimum: 0, maximum: 1 },
        geocoding: { type: 'number', minimum: 0, maximum: 1 }
      },
      required: ['speechRecognition', 'classification', 'addressExtraction', 'geocoding'],
      additionalProperties: false
    },
    requiresManualReview: { type: 'boolean' },
    requiresTicketRegistration: { type: 'boolean' },
    suggestedQuestions: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    duplicatesFound: { type: 'array', maxItems: 0 }
  },
  required: ['ticket', 'confidence', 'requiresManualReview', 'requiresTicketRegistration', 'suggestedQuestions', 'duplicatesFound'],
  additionalProperties: false,
  propertyOrdering: ['ticket', 'confidence', 'requiresManualReview', 'requiresTicketRegistration', 'suggestedQuestions', 'duplicatesFound']
  };
}

function normalizeCatalogValues(values) {
  if (!Array.isArray(values)) return null;

  const uniqueValues = [];
  for (const value of values) {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!normalized || normalized.length > 160) return null;
    if (!uniqueValues.includes(normalized)) uniqueValues.push(normalized);
    if (uniqueValues.length > 100) return null;
  }

  return uniqueValues;
}

function getTicketCatalog(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_TICKET_CATALOG;
  }

  const appealTypes = normalizeCatalogValues(value.appealTypes);
  const ticketTypes = normalizeCatalogValues(value.ticketTypes);
  if (!appealTypes || appealTypes.length === 0 || !ticketTypes || ticketTypes.length === 0) {
    return DEFAULT_TICKET_CATALOG;
  }

  return { appealTypes, ticketTypes };
}

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

  const { model, parts, catalog: requestedCatalog } = request;
  const invalidRequestReason = getInvalidRequestReason(model, parts);
  if (invalidRequestReason) {
    return sendJson(res, 400, {
      error: 'Invalid Gemini request',
      reason: invalidRequestReason,
      ...(typeof model === 'string' ? { model } : {}),
      ...(invalidRequestReason === 'model_not_allowed' ? { allowedModels: [...ALLOWED_MODELS] } : {})
    });
  }

  const catalog = getTicketCatalog(requestedCatalog);

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
            responseJsonSchema: createTicketDraftSchema(catalog),
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
