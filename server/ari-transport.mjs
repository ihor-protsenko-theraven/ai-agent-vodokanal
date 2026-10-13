import { ariEventsWebSocketUrl } from '../src/features/asterisk/domain/asteriskModel.ts';

const ANSWERED_ALREADY = 409;

/**
 * REST and events client for one Asterisk ARI application.
 * Credentials stay in this process and are never copied into a snapshot.
 */
export function createAriTransport(credentials, websocketFactory = globalThis.WebSocket) {
  const authorization = `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`;
  const root = credentials.url.replace(/\/$/, '');

  return {
    request(method, path) {
      return requestAri(root, authorization, method, path);
    },
    connectEvents({ onEvent, onOpen, onClose }) {
      const socket = new websocketFactory(ariEventsWebSocketUrl(
        credentials.url,
        credentials.app,
        credentials.username,
        credentials.password
      ));
      socket.addEventListener('open', () => onOpen());
      socket.addEventListener('message', (event) => deliverEvent(event.data, onEvent));
      socket.addEventListener('close', () => onClose());
      socket.addEventListener('error', () => {
        console.error('ARI event socket failed');
      });
      return () => socket.close();
    }
  };
}

async function requestAri(root, authorization, method, path) {
  const response = await fetch(`${root}${path}`, {
    method,
    headers: { authorization, accept: 'application/json' },
    signal: AbortSignal.timeout(5000)
  });
  const text = await response.text();
  const body = text ? parseJson(text) : null;
  if (!response.ok && response.status !== ANSWERED_ALREADY) {
    throw new Error(`ARI ${method} failed with ${response.status}`);
  }
  return { ok: response.ok || response.status === ANSWERED_ALREADY, status: response.status, body };
}

function deliverEvent(data, onEvent) {
  try {
    onEvent(JSON.parse(String(data)));
  } catch {
    console.error('Ignored a malformed ARI event');
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 120) };
  }
}
