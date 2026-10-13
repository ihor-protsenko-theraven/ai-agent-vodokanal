import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createAriTransport } from './ari-transport.mjs';
import {
  createSnapshot,
  isLiveCall,
  isSafeAriToken,
  maskCallerNumber,
  parseAriMessage,
  readAriCredentials,
  readBridgeConfig,
  reduceAsteriskSnapshot
} from '../src/features/asterisk/domain/asteriskModel.ts';

const MAX_BODY_BYTES = 4096;
const MAX_BACKOFF_MS = 30000;

export function createAsteriskBridge(options = {}) {
  const env = options.env ?? process.env;
  const config = readBridgeConfig(env);
  const credentials = readAriCredentials(env);
  const transport = options.transport ?? (credentials ? createAriTransport(credentials) : null);
  const now = options.now ?? (() => new Date().toISOString());
  const schedule = options.schedule ?? ((callback, delay) => setTimeout(callback, delay));
  const state = {
    snapshot: createSnapshot(config, config.mode === 'simulate' ? 'connected' : 'disconnected'),
    callCounter: 0,
    sseClients: new Set(),
    stopSocket: () => {},
    reconnectTimer: null,
    backoffMs: 1000,
    stopped: false
  };

  const bridge = {
    snapshot: () => state.snapshot,
    start: () => {
      if (config.mode === 'ari') {
        void connectAri(state, config, credentials, transport, schedule);
      }
    },
    stop: () => stopBridge(state),
    addSseClient: (response) => state.sseClients.add(response),
    removeSseClient: (response) => state.sseClients.delete(response),
    handle: (method, rawUrl, body) => handleRequest({
      state, config, transport, now, method, rawUrl, body
    })
  };
  return bridge;
}

export function listenAsteriskBridge(bridge, port, host = '127.0.0.1') {
  const server = createServer(async (request, response) => {
    try {
      const body = await readBody(request, response);
      if (body === undefined) {
        return;
      }
      const result = await bridge.handle(request.method ?? 'GET', request.url ?? '/', body);
      if (result.sse) {
        writeEventStream(response, result.body);
        bridge.addSseClient(response);
        request.on('close', () => bridge.removeSseClient(response));
        return;
      }
      writeJson(response, result.status, result.body);
    } catch {
      console.error('Asterisk bridge request failed');
      writeJson(response, 500, { error: 'bridge_error' });
    }
  });
  server.listen(port, host);
  return server;
}

async function handleRequest({ state, config, transport, now, method, rawUrl, body }) {
  const path = new URL(rawUrl, 'http://bridge.local').pathname;
  if (method === 'GET' && path === '/api/asterisk/status') {
    return jsonResult(200, state.snapshot);
  }
  if (method === 'GET' && path === '/api/asterisk/events') {
    return { status: 200, body: state.snapshot, sse: true };
  }
  const transferMatch = path.match(/^\/api\/asterisk\/calls\/([^/]+)\/transfer$/);
  if (method === 'POST' && transferMatch) {
    return transferCall(state, config, transport, decodeURIComponent(transferMatch[1]), body);
  }
  if (method === 'POST' && path === '/api/asterisk/simulate/calls') {
    return simulateCall(state, config, now, body);
  }
  const hangupMatch = path.match(/^\/api\/asterisk\/simulate\/calls\/([^/]+)\/hangup$/);
  if (method === 'POST' && hangupMatch) {
    return simulateSignal(state, config, decodeURIComponent(hangupMatch[1]), 'channel_destroyed');
  }
  const speechMatch = path.match(/^\/api\/asterisk\/simulate\/calls\/([^/]+)\/speech$/);
  if (method === 'POST' && speechMatch) {
    return simulateSpeech(state, config, decodeURIComponent(speechMatch[1]), body);
  }
  return jsonResult(404, { error: 'not_found' });
}

function simulateCall(state, config, now, body) {
  if (config.mode !== 'simulate') {
    return jsonResult(409, { error: 'simulate_disabled', ...state.snapshot });
  }
  if (isLiveCall(state.snapshot.activeCall)) {
    return jsonResult(409, { error: 'call_already_active', ...state.snapshot });
  }
  state.callCounter += 1;
  const channelId = `SIM-${state.callCounter}`;
  const callerNumber = typeof body?.callerNumber === 'string' ? body.callerNumber.slice(0, 40) : '';
  reduce(state, {
    type: 'stasis_start',
    channelId,
    callerNumber,
    startedAt: now(),
    channelState: 'Ring'
  });
  reduce(state, { type: 'channel_state', channelId, state: 'Up' });
  return jsonResult(200, state.snapshot);
}

function simulateSignal(state, config, channelId, type) {
  if (config.mode !== 'simulate') {
    return jsonResult(409, { error: 'simulate_disabled', ...state.snapshot });
  }
  reduce(state, { type, channelId });
  return jsonResult(200, state.snapshot);
}

function simulateSpeech(state, config, channelId, body) {
  if (config.mode !== 'simulate') {
    return jsonResult(409, { error: 'simulate_disabled', ...state.snapshot });
  }
  const text = typeof body?.text === 'string' ? body.text.slice(0, 500) : '';
  reduce(state, { type: 'speech', channelId, text });
  return jsonResult(200, state.snapshot);
}

async function transferCall(state, config, transport, channelId, body) {
  const call = state.snapshot.activeCall;
  if (!call || call.id !== channelId || !isLiveCall(call) || call.phase === 'transferring') {
    return jsonResult(409, { error: 'call_not_transferable', ...state.snapshot });
  }
  const reason = normalizeReason(body?.reason);
  const operatorId = typeof body?.operatorId === 'string' ? body.operatorId : '';
  reduce(state, { type: 'transfer_started', channelId, reason });
  if (config.mode === 'simulate') {
    reduce(state, { type: 'transfer_completed', channelId, reason });
    return jsonResult(200, state.snapshot);
  }
  const moved = await redirectToOperator(config, transport, channelId, operatorId);
  reduce(state, moved
    ? { type: 'transfer_completed', channelId, reason }
    : { type: 'transfer_failed', channelId });
  return jsonResult(moved ? 200 : 502, moved ? state.snapshot : { error: 'asterisk_transfer_failed', ...state.snapshot });
}

async function redirectToOperator(config, transport, channelId, operatorId) {
  if (config.mode !== 'ari' || !transport || !isSafeAriToken(config.operatorEndpoint)) {
    return false;
  }
  try {
    if (isSafeAriToken(operatorId)) {
      const variable = encodeURIComponent('WSN_OPERATOR');
      const value = encodeURIComponent(operatorId);
      await transport.request('POST', `/channels/${encodeURIComponent(channelId)}/variable?variable=${variable}&value=${value}`);
    }
    await transport.request('POST', `/channels/${encodeURIComponent(channelId)}/redirect?endpoint=${encodeURIComponent(config.operatorEndpoint)}`);
    return true;
  } catch {
    console.error('Asterisk transfer failed');
    return false;
  }
}

async function connectAri(state, config, credentials, transport, schedule) {
  if (!transport || !credentials || state.stopped) {
    return;
  }
  reduce(state, {
    type: 'link',
    link: state.snapshot.link === 'connected' ? 'reconnecting' : 'connecting',
    message: config.message
  });
  state.stopSocket = transport.connectEvents({
    onOpen: () => {
      state.backoffMs = 1000;
      reduce(state, { type: 'link', link: 'connected', message: config.message });
      void resyncChannels(state, transport, credentials);
    },
    onEvent: (raw) => {
      void acceptAriEvent(state, config, transport, raw);
    },
    onClose: () => scheduleReconnect(state, config, credentials, transport, schedule)
  });
}

function scheduleReconnect(state, config, credentials, transport, schedule) {
  if (state.stopped) {
    return;
  }
  reduce(state, { type: 'disconnect' });
  state.reconnectTimer = schedule(() => {
    void connectAri(state, config, credentials, transport, schedule);
  }, state.backoffMs);
  state.backoffMs = Math.min(state.backoffMs * 2, MAX_BACKOFF_MS);
}

async function acceptAriEvent(state, config, transport, raw) {
  const event = parseAriMessage(raw);
  if (!event || event.type === 'stasis_end') {
    if (event?.type === 'stasis_end') {
      reduce(state, event);
    }
    return;
  }
  const previousId = state.snapshot.activeCall?.id ?? null;
  reduce(state, event);
  const started = event.type === 'stasis_start' && state.snapshot.activeCall?.id === event.channelId && previousId !== event.channelId;
  if (!started) {
    return;
  }
  console.info(`Asterisk call ${event.channelId} from ${maskCallerNumber(event.callerNumber)}`);
  await answerAndAttach(state, config, transport, event.channelId);
}

async function answerAndAttach(state, config, transport, channelId) {
  await transport.request('POST', `/channels/${encodeURIComponent(channelId)}/answer`).catch(() => null);
  if (!config.mediaHost) {
    return;
  }
  const mediaPath = await attachExternalMedia(transport, config.appName, channelId, config.mediaHost);
  reduce(state, {
    type: 'media',
    channelId,
    status: mediaPath ? 'attached' : 'failed',
    mediaPath
  });
  if (!mediaPath && config.requireMedia) {
    await transferCall(state, config, transport, channelId, { reason: 'dialogue_failed', operatorId: '' });
  }
}

async function attachExternalMedia(transport, appName, channelId, host) {
  try {
    const app = encodeURIComponent(appName);
    const external = await transport.request('POST', `/channels/externalMedia?app=${app}&external_host=${encodeURIComponent(host)}&format=ulaw`);
    const snoop = await transport.request('POST', `/channels/${encodeURIComponent(channelId)}/snoop?app=${app}&spy=in`);
    const externalId = external.body?.id;
    const snoopId = snoop.body?.id;
    if (!external.ok || !snoop.ok || !externalId || !snoopId) {
      return null;
    }
    const mixing = await transport.request('POST', '/bridges?type=mixing');
    if (!mixing.ok || !mixing.body?.id) {
      return null;
    }
    const added = await transport.request('POST', `/bridges/${encodeURIComponent(mixing.body.id)}/addChannel?channel=${encodeURIComponent(snoopId)},${encodeURIComponent(externalId)}`);
    return added.ok ? `externalMedia:${host}` : null;
  } catch {
    return null;
  }
}

async function resyncChannels(state, transport, credentials) {
  try {
    const listed = await transport.request('GET', `/channels?app=${encodeURIComponent(credentials.app)}`);
    const channels = Array.isArray(listed.body) ? listed.body : [];
    channels.forEach((channel) => {
      const event = parseAriMessage({ type: 'StasisStart', channel });
      if (event?.type !== 'stasis_start') {
        return;
      }
      reduce(state, {
        type: 'resync',
        channelId: event.channelId,
        callerNumber: event.callerNumber,
        startedAt: event.startedAt,
        state: event.channelState
      });
    });
  } catch {
    console.error('Asterisk channel resync failed');
  }
}

function reduce(state, event) {
  state.snapshot = reduceAsteriskSnapshot(state.snapshot, event);
  const payload = `data: ${JSON.stringify(state.snapshot)}\n\n`;
  for (const client of state.sseClients) {
    client.write(payload);
  }
}

function stopBridge(state) {
  state.stopped = true;
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
  }
  state.stopSocket();
  for (const client of state.sseClients) {
    client.end();
  }
  state.sseClients.clear();
}

function normalizeReason(value) {
  if (value === 'subscriber_request' || value === 'dialogue_failed' || value === 'operator') {
    return value;
  }
  return 'operator';
}

function jsonResult(status, body) {
  return { status, body, sse: false };
}

async function readBody(request, response) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      writeJson(response, 413, { error: 'body_too_large' });
      return undefined;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    writeJson(response, 400, { error: 'invalid_json' });
    return undefined;
  }
}

function writeEventStream(response, snapshot) {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  response.write(`data: ${JSON.stringify(snapshot)}\n\n`);
}

function writeJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(body));
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  if (!process.env.ASTERISK_MODE && !readAriCredentials(process.env)) {
    process.env.ASTERISK_MODE = 'simulate';
  }
  const port = Number(process.env.ASTERISK_BRIDGE_PORT || 3002);
  const bridge = createAsteriskBridge();
  bridge.start();
  listenAsteriskBridge(bridge, port);
  const mode = bridge.snapshot().mode;
  console.info(`Asterisk bridge listening on 127.0.0.1:${port} (${mode})`);
}
