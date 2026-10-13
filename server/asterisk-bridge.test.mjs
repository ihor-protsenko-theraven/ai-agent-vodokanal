import { once } from 'node:events';
import { afterEach, describe, expect, it } from 'vitest';
import { createAsteriskBridge, listenAsteriskBridge } from './asterisk-bridge.mjs';

const ariEnv = {
  ASTERISK_ARI_URL: 'https://pbx.example/ari',
  ASTERISK_ARI_USERNAME: 'wsn',
  ASTERISK_ARI_PASSWORD: 'ari-test-pass',
  ASTERISK_ARI_APP: 'wsn-dispatcher',
  ASTERISK_OPERATOR_ENDPOINT: 'PJSIP/100'
};

const servers = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
});

describe('asterisk bridge', () => {
  it('simulates a call, transfers it, and keeps the ARI password out of the status', async () => {
    const bridge = createAsteriskBridge({
      env: { ASTERISK_MODE: 'simulate', ASTERISK_OPERATOR_ENDPOINT: 'PJSIP/100' },
      now: () => '2026-10-13T08:15:00.000Z'
    });
    const created = await bridge.handle('POST', '/api/asterisk/simulate/calls', { callerNumber: '0501112233' });
    expect(created.status).toBe(200);
    expect(created.body.activeCall).toMatchObject({
      id: 'SIM-1',
      callerNumber: '+380501112233',
      phase: 'active'
    });
    expect(JSON.stringify(created.body)).not.toContain('ari-test-pass');

    const transferred = await bridge.handle('POST', '/api/asterisk/calls/SIM-1/transfer', {
      reason: 'operator',
      operatorId: 'OPERATOR-402'
    });
    expect(transferred.status).toBe(200);
    expect(transferred.body.activeCall.phase).toBe('transferred');
    expect(transferred.body.activeCall.transferReason).toBe('operator');

    const ended = await bridge.handle('POST', '/api/asterisk/simulate/calls/SIM-1/hangup', {});
    expect(ended.body.activeCall.phase).toBe('ended');
  });

  it('rejects call control when Asterisk is not configured', async () => {
    const bridge = createAsteriskBridge({ env: {} });
    const status = await bridge.handle('GET', '/api/asterisk/status', null);
    expect(status.body.mode).toBe('unavailable');
    expect(status.body.message).toContain('Ручна реєстрація заявки доступна');
    const transfer = await bridge.handle('POST', '/api/asterisk/calls/none/transfer', { reason: 'operator' });
    expect(transfer.status).toBe(409);
    const simulated = await bridge.handle('POST', '/api/asterisk/simulate/calls', { callerNumber: '0501112233' });
    expect(simulated.status).toBe(409);
  });

  it('answers an ARI channel, redirects it to the operator, and reconnects after the socket drops', async () => {
    const requests = [];
    const handlers = {};
    const scheduled = [];
    const bridge = createAsteriskBridge({
      env: ariEnv,
      schedule: (callback, delay) => {
        scheduled.push({ callback, delay });
        return 0;
      },
      transport: {
        request: async (method, path) => {
          requests.push({ method, path });
          if (path.startsWith('/channels?')) {
            return { ok: true, status: 200, body: [] };
          }
          return { ok: true, status: 204, body: null };
        },
        connectEvents(callbacks) {
          Object.assign(handlers, callbacks);
          return () => {};
        }
      }
    });
    bridge.start();
    handlers.onOpen();
    handlers.onEvent({
      type: 'StasisStart',
      channel: {
        id: 'ch-1',
        caller: { number: '0501112233' },
        creationtime: '2026-10-13T08:15:00.000Z',
        state: 'Ring'
      }
    });
    await new Promise((resolve) => setImmediate(resolve));

    expect(bridge.snapshot().activeCall).toMatchObject({ id: 'ch-1', callerNumber: '+380501112233', phase: 'ringing' });
    expect(requests.some((request) => request.path === '/channels/ch-1/answer')).toBe(true);
    expect(JSON.stringify(bridge.snapshot())).not.toContain('ari-test-pass');

    const transferred = await bridge.handle('POST', '/api/asterisk/calls/ch-1/transfer', {
      reason: 'operator',
      operatorId: 'OPERATOR-402'
    });
    expect(transferred.status).toBe(200);
    expect(requests.some((request) => request.path.includes('variable=WSN_OPERATOR') && request.path.includes('OPERATOR-402'))).toBe(true);
    expect(requests.some((request) => request.path.includes('/redirect?endpoint=PJSIP%2F100'))).toBe(true);

    handlers.onClose();
    expect(bridge.snapshot().link).toBe('reconnecting');
    expect(scheduled[0]?.delay).toBe(1000);
    bridge.stop();
  });

  it('forwards audio to an external media host and does not keep a recording', async () => {
    const requests = [];
    const handlers = {};
    const bridge = createAsteriskBridge({
      env: { ...ariEnv, ASTERISK_EXTERNAL_MEDIA_HOST: '127.0.0.1:4000' },
      transport: {
        request: async (method, path) => {
          requests.push(path);
          if (path.startsWith('/channels/externalMedia')) return { ok: true, status: 200, body: { id: 'ext-1' } };
          if (path.includes('/snoop')) return { ok: true, status: 200, body: { id: 'snoop-1' } };
          if (path.startsWith('/bridges?')) return { ok: true, status: 200, body: { id: 'br-1' } };
          if (path.includes('/addChannel')) return { ok: true, status: 200, body: {} };
          return { ok: true, status: 204, body: null };
        },
        connectEvents(callbacks) {
          Object.assign(handlers, callbacks);
          return () => {};
        }
      }
    });
    bridge.start();
    handlers.onOpen();
    handlers.onEvent({
      type: 'StasisStart',
      channel: { id: 'ch-9', caller: { number: '0501112233' }, creationtime: '2026-10-13T08:15:00.000Z', state: 'Up' }
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(requests.some((path) => path.startsWith('/channels/externalMedia'))).toBe(true);
    expect(bridge.snapshot().activeCall).toMatchObject({
      mediaStatus: 'attached',
      mediaPath: 'externalMedia:127.0.0.1:4000'
    });
    expect(JSON.stringify(bridge.snapshot())).not.toContain('ulaw');
  });

  it('serves the simulator over HTTP', async () => {
    const bridge = createAsteriskBridge({
      env: { ASTERISK_MODE: 'simulate' },
      now: () => '2026-10-13T08:15:00.000Z'
    });
    const server = listenAsteriskBridge(bridge, 0);
    servers.push(server);
    await once(server, 'listening');
    const port = server.address().port;
    const created = await fetch(`http://127.0.0.1:${port}/api/asterisk/simulate/calls`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ callerNumber: '0501234567' })
    });
    const body = await created.json();
    expect(created.status).toBe(200);
    expect(body.activeCall.callerNumber).toBe('+380501234567');
    expect(body.mode).toBe('simulate');
  });
});
