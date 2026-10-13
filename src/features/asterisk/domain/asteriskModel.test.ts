import { describe, expect, it } from 'vitest';
import {
  ariEventsWebSocketUrl,
  createSnapshot,
  detectHandoffRequest,
  maskCallerNumber,
  mergeAsteriskCallIntoDraft,
  normalizeCallerNumber,
  toLocalDateTimeInput,
  parseAriMessage,
  readAriCredentials,
  readAsteriskSnapshot,
  readBridgeConfig,
  reduceAsteriskSnapshot,
  type AsteriskSnapshot
} from './asteriskModel';

const CALLER_NUMBER = '+380501112233';
const ARI_URL = 'https://pbx.example/ari';
const ARI_PASSWORD = 'ari-test-pass';
const ARI_APP = 'wsn-dispatcher';

const startedAt = '2026-10-13T08:15:00.000Z';

function simulateSnapshot(): AsteriskSnapshot {
  const config = readBridgeConfig({ ASTERISK_MODE: 'simulate', ASTERISK_OPERATOR_ENDPOINT: 'PJSIP/100' });
  return { ...createSnapshot(config, 'connected'), link: 'connected' };
}

describe('normalizeCallerNumber', () => {
  it('normalizes Ukrainian numbers from Asterisk caller id', () => {
    expect(normalizeCallerNumber(CALLER_NUMBER)).toBe(CALLER_NUMBER);
    expect(normalizeCallerNumber('380501112233')).toBe(CALLER_NUMBER);
    expect(normalizeCallerNumber('050 111-22-33')).toBe(CALLER_NUMBER);
    expect(normalizeCallerNumber('sip:0501112233@pbx.local')).toBe(CALLER_NUMBER);
  });

  it('leaves anonymous and short numbers empty', () => {
    expect(normalizeCallerNumber('anonymous')).toBe('');
    expect(normalizeCallerNumber('123')).toBe('');
  });
});

describe('detectHandoffRequest', () => {
  it('recognizes a request for a human operator once per phrase list', () => {
    expect(detectHandoffRequest("з'єднайте з оператором")).toBe(true);
    expect(detectHandoffRequest('соедините меня пожалуйста')).toBe(true);
    expect(detectHandoffRequest('переведіть на живу людину')).toBe(true);
  });

  it('ignores an incident description that does not ask for a person', () => {
    expect(detectHandoffRequest('витік води біля будинку 15')).toBe(false);
  });
});

describe('mergeAsteriskCallIntoDraft', () => {
  const call = { id: 'ch-1', callerNumber: CALLER_NUMBER, startedAt };

  it('fills an empty phone and replaces the generated call id', () => {
    const merged = mergeAsteriskCallIntoDraft({
      callId: 'NEW-1',
      phoneNumber: '',
      incidentDateTime: '2026-10-13T12:00',
      phoneEdited: false,
      incidentEdited: false
    }, call);

    expect(merged.callId).toBe('ch-1');
    expect(merged.phoneNumber).toBe(CALLER_NUMBER);
    expect(merged.incidentDateTime).toBe(toLocalDateTimeInput(startedAt));
  });

  it('keeps a phone and incident time the operator already edited', () => {
    const merged = mergeAsteriskCallIntoDraft({
      callId: 'NEW-1',
      phoneNumber: '+380671234567',
      incidentDateTime: '2026-10-13T09:00',
      phoneEdited: true,
      incidentEdited: true
    }, call);

    expect(merged.phoneNumber).toBe('+380671234567');
    expect(merged.incidentDateTime).toBe('2026-10-13T09:00');
    expect(merged.callId).toBe('ch-1');
  });
});

describe('reduceAsteriskSnapshot', () => {
  it('tracks one live call through answer, handoff, transfer, and disconnect', () => {
    let snapshot = simulateSnapshot();
    snapshot = reduceAsteriskSnapshot(snapshot, {
      type: 'stasis_start',
      channelId: 'ch-1',
      callerNumber: '0501112233',
      startedAt,
      channelState: 'Ring'
    });
    snapshot = reduceAsteriskSnapshot(snapshot, {
      type: 'stasis_start',
      channelId: 'ch-2',
      callerNumber: '0509998877',
      startedAt,
      channelState: 'Ring'
    });
    expect(snapshot.activeCall?.id).toBe('ch-1');
    expect(snapshot.activeCall?.callerNumber).toBe(CALLER_NUMBER);

    snapshot = reduceAsteriskSnapshot(snapshot, { type: 'channel_state', channelId: 'ch-1', state: 'Up' });
    expect(snapshot.activeCall?.phase).toBe('active');

    snapshot = reduceAsteriskSnapshot(snapshot, {
      type: 'speech',
      channelId: 'ch-1',
      text: 'переключіть на оператора'
    });
    expect(snapshot.activeCall?.handoffRequested).toBe(true);

    snapshot = reduceAsteriskSnapshot(snapshot, {
      type: 'transfer_completed',
      channelId: 'ch-1',
      reason: 'subscriber_request'
    });
    expect(snapshot.activeCall?.phase).toBe('transferred');

    snapshot = reduceAsteriskSnapshot(snapshot, { type: 'disconnect' });
    expect(snapshot.link).toBe('reconnecting');
    expect(snapshot.activeCall?.phase).toBe('transferred');
  });

  it('marks a live call interrupted and restores it from a resync', () => {
    let snapshot = reduceAsteriskSnapshot(simulateSnapshot(), {
      type: 'stasis_start',
      channelId: 'ch-1',
      callerNumber: '0501112233',
      startedAt,
      channelState: 'Up'
    });
    snapshot = reduceAsteriskSnapshot(snapshot, { type: 'disconnect' });
    expect(snapshot.activeCall?.phase).toBe('interrupted');
    snapshot = reduceAsteriskSnapshot(snapshot, {
      type: 'resync',
      channelId: 'ch-1',
      callerNumber: '0501112233',
      startedAt,
      state: 'Up'
    });
    expect(snapshot.activeCall?.phase).toBe('active');
    expect(snapshot.link).toBe('connected');
  });

  it('ends the call when the channel is destroyed', () => {
    let snapshot = reduceAsteriskSnapshot(simulateSnapshot(), {
      type: 'stasis_start',
      channelId: 'ch-1',
      callerNumber: 'anonymous',
      startedAt,
      channelState: 'Ring'
    });
    snapshot = reduceAsteriskSnapshot(snapshot, { type: 'channel_destroyed', channelId: 'ch-1' });
    expect(snapshot.activeCall?.phase).toBe('ended');
    expect(snapshot.activeCall?.callerNumber).toBe('');
  });
});

describe('parseAriMessage', () => {
  it('reads StasisStart and ignores unrelated events', () => {
    const parsed = parseAriMessage({
      type: 'StasisStart',
      channel: {
        id: '172882.32',
        caller: { number: '0501112233' },
        creationtime: startedAt,
        state: 'Ring'
      }
    });
    expect(parsed).toMatchObject({ type: 'stasis_start', channelId: '172882.32', callerNumber: '0501112233' });
    expect(parseAriMessage({ type: 'ChannelVarset' })).toBeNull();
    expect(parseAriMessage(null)).toBeNull();
  });
});

describe('bridge configuration', () => {
  it('prefers an explicit simulator and never returns the ARI password', () => {
    const credentials = {
      ASTERISK_ARI_URL: ARI_URL,
      ASTERISK_ARI_USERNAME: 'wsn',
      ASTERISK_ARI_PASSWORD: ARI_PASSWORD,
      ASTERISK_ARI_APP: ARI_APP
    };
    const config = readBridgeConfig({ ASTERISK_MODE: 'simulate', ...credentials });
    expect(config.mode).toBe('simulate');
    expect(JSON.stringify(config)).not.toContain(ARI_PASSWORD);
    expect(readAriCredentials(credentials)?.app).toBe(ARI_APP);
  });

  it('stays unavailable when ARI credentials are incomplete', () => {
    expect(readBridgeConfig({ ASTERISK_ARI_URL: ARI_URL }).mode).toBe('unavailable');
    expect(readBridgeConfig({ ASTERISK_MODE: 'off', ASTERISK_ARI_URL: ARI_URL, ASTERISK_ARI_USERNAME: 'wsn', ASTERISK_ARI_PASSWORD: 'x', ASTERISK_ARI_APP: 'app' }).mode).toBe('unavailable');
  });

  it('builds the events websocket without putting the password into the snapshot', () => {
    const url = ariEventsWebSocketUrl(ARI_URL, ARI_APP, 'wsn', ARI_PASSWORD);
    expect(url.startsWith('wss://pbx.example/ari/events?')).toBe(true);
    expect(url).toContain(`app=${ARI_APP}`);
    const snapshot = createSnapshot(readBridgeConfig({}));
    const parsed = readAsteriskSnapshot(snapshot);
    expect(parsed?.mode).toBe('unavailable');
    expect(JSON.stringify(parsed)).not.toContain(ARI_PASSWORD);
    expect(maskCallerNumber('0501112233')).toBe('…2233');
  });
});
