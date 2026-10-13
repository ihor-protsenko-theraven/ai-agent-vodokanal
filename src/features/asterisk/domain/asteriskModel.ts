/**
 * Pure Asterisk call model. No fetch, DOM, or credentials.
 * The persistent bridge and the operator UI both use these rules.
 */

export type AsteriskBridgeMode = 'ari' | 'simulate' | 'unavailable';

export type AsteriskLinkState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export type AsteriskCallPhase =
  | 'ringing'
  | 'active'
  | 'transferring'
  | 'transferred'
  | 'ended'
  | 'interrupted';

export type AsteriskTransferReason = 'operator' | 'subscriber_request' | 'dialogue_failed';

export type AsteriskMediaStatus = 'not_configured' | 'pending' | 'attached' | 'failed';

export type AsteriskBadgeTone = 'ok' | 'warn' | 'muted';

export interface AsteriskCall {
  id: string;
  callerNumber: string;
  rawCallerNumber: string;
  startedAt: string;
  phase: AsteriskCallPhase;
  transferReason: AsteriskTransferReason | null;
  handoffRequested: boolean;
  mediaStatus: AsteriskMediaStatus;
  mediaPath: string | null;
}

export interface AsteriskSnapshot {
  mode: AsteriskBridgeMode;
  link: AsteriskLinkState;
  activeCall: AsteriskCall | null;
  operatorEndpoint: string;
  mediaMode: 'control-plane' | 'external-media';
  message: string;
}

export interface AsteriskDraftFields {
  callId: string;
  phoneNumber: string;
  incidentDateTime: string;
  phoneEdited: boolean;
  incidentEdited: boolean;
}

export interface AsteriskCallDraft {
  id: string;
  callerNumber: string;
  startedAt: string;
}

export type AsteriskDomainEvent =
  | { type: 'link'; link: AsteriskLinkState; message: string }
  | { type: 'stasis_start'; channelId: string; callerNumber: string; startedAt: string; channelState: string }
  | { type: 'channel_state'; channelId: string; state: string }
  | { type: 'stasis_end'; channelId: string }
  | { type: 'channel_destroyed'; channelId: string }
  | { type: 'transfer_started'; channelId: string; reason: AsteriskTransferReason }
  | { type: 'transfer_completed'; channelId: string; reason: AsteriskTransferReason }
  | { type: 'transfer_failed'; channelId: string }
  | { type: 'media'; channelId: string; status: AsteriskMediaStatus; mediaPath: string | null }
  | { type: 'speech'; channelId: string; text: string }
  | { type: 'disconnect' }
  | { type: 'resync'; channelId: string; callerNumber: string; startedAt: string; state: string };

export interface PublicBridgeConfig {
  mode: AsteriskBridgeMode;
  operatorEndpoint: string;
  mediaHost: string;
  requireMedia: boolean;
  appName: string;
  message: string;
  mediaMode: 'control-plane' | 'external-media';
}

export interface AriCredentials {
  url: string;
  username: string;
  password: string;
  app: string;
}

const LIVE_PHASES: readonly AsteriskCallPhase[] = ['ringing', 'active', 'interrupted', 'transferring'];

const HANDOFF_PHRASES = [
  "з'єднайте",
  'зʼєднайте',
  'зєднайте',
  'соедин',
  'перевед',
  'переключ',
  'живу людину',
  'з людиною',
  'з оператор',
  'на оператор'
];

const MANUAL_REGISTRATION = 'Ручна реєстрація заявки доступна.';
const CONTROL_PLANE = 'control-plane' as const;
const EXTERNAL_MEDIA = 'external-media' as const;
const DISPATCHER_APP = 'wsn-dispatcher';

export function isLiveCall(call: AsteriskCall | null): boolean {
  return call !== null && LIVE_PHASES.includes(call.phase);
}

export function canTransferCall(call: AsteriskCall | null): boolean {
  return call !== null && (call.phase === 'ringing' || call.phase === 'active' || call.phase === 'interrupted');
}

export function normalizeCallerNumber(raw: string): string {
  const localPart = raw.trim().replace(/^sip:/i, '').split('@')[0] ?? '';
  const digits = localPart.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('380')) {
    return `+${digits}`;
  }
  if (digits.length === 10 && digits.startsWith('0')) {
    return `+38${digits}`;
  }
  return '';
}

export function detectHandoffRequest(text: string): boolean {
  const normalized = text.toLowerCase().replace(/[’`]/g, "'");
  return HANDOFF_PHRASES.some((phrase) => normalized.includes(phrase));
}

export function toLocalDateTimeInput(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function mergeAsteriskCallIntoDraft(draft: AsteriskDraftFields, call: AsteriskCallDraft): AsteriskDraftFields {
  const phoneNumber = !draft.phoneEdited && draft.phoneNumber.trim() === '' && call.callerNumber
    ? call.callerNumber
    : draft.phoneNumber;
  const incidentFromCall = toLocalDateTimeInput(call.startedAt);
  const incidentDateTime = !draft.incidentEdited && incidentFromCall
    ? incidentFromCall
    : draft.incidentDateTime;

  return {
    callId: call.id || draft.callId,
    phoneNumber,
    incidentDateTime,
    phoneEdited: draft.phoneEdited,
    incidentEdited: draft.incidentEdited
  };
}

export function readBridgeConfig(env: Record<string, string | undefined>): PublicBridgeConfig {
  const mode = resolveMode(env);
  const mediaHost = (env.ASTERISK_EXTERNAL_MEDIA_HOST ?? '').trim();
  const mediaMode = mediaHost ? EXTERNAL_MEDIA : CONTROL_PLANE;
  return {
    mode,
    operatorEndpoint: (env.ASTERISK_OPERATOR_ENDPOINT ?? '').trim(),
    mediaHost,
    requireMedia: env.ASTERISK_REQUIRE_MEDIA === 'true',
    appName: (env.ASTERISK_ARI_APP ?? DISPATCHER_APP).trim() || DISPATCHER_APP,
    mediaMode,
    message: bridgeMessage(mode, mediaMode)
  };
}

export function readAriCredentials(env: Record<string, string | undefined>): AriCredentials | null {
  const url = (env.ASTERISK_ARI_URL ?? '').trim();
  const username = (env.ASTERISK_ARI_USERNAME ?? '').trim();
  const password = env.ASTERISK_ARI_PASSWORD ?? '';
  const app = (env.ASTERISK_ARI_APP ?? '').trim();
  if (!url || !username || !password || !app) {
    return null;
  }
  return { url, username, password, app };
}

export function createSnapshot(config: PublicBridgeConfig, link: AsteriskLinkState = 'disconnected'): AsteriskSnapshot {
  return {
    mode: config.mode,
    link: config.mode === 'unavailable' ? 'disconnected' : link,
    activeCall: null,
    operatorEndpoint: config.operatorEndpoint,
    mediaMode: config.mediaMode,
    message: config.message
  };
}

type PresenceEvent = Extract<AsteriskDomainEvent, { type: 'link' | 'disconnect' | 'resync' | 'stasis_start' }>;
type CallEvent = Exclude<AsteriskDomainEvent, PresenceEvent>;

export function reduceAsteriskSnapshot(snapshot: AsteriskSnapshot, event: AsteriskDomainEvent): AsteriskSnapshot {
  if (isPresenceEvent(event)) {
    return reducePresence(snapshot, event);
  }
  return reduceCall(snapshot, event);
}

function isPresenceEvent(event: AsteriskDomainEvent): event is PresenceEvent {
  switch (event.type) {
    case 'link':
    case 'disconnect':
    case 'resync':
    case 'stasis_start':
      return true;
    default:
      return false;
  }
}

function reducePresence(snapshot: AsteriskSnapshot, event: PresenceEvent): AsteriskSnapshot {
  switch (event.type) {
    case 'link':
      return { ...snapshot, link: event.link, message: event.message || snapshot.message };
    case 'stasis_start':
      return applyStasisStart(snapshot, event);
    case 'disconnect':
      return applyDisconnect(snapshot);
    case 'resync':
      return applyResync(snapshot, event);
    default: {
      const unexpected: never = event;
      throw new Error(`Unhandled Asterisk event: ${JSON.stringify(unexpected)}`);
    }
  }
}

function reduceCall(snapshot: AsteriskSnapshot, event: CallEvent): AsteriskSnapshot {
  switch (event.type) {
    case 'channel_state':
      return updateLiveCall(snapshot, event.channelId, (call) => ({ ...call, phase: phaseFromChannelState(event.state) }));
    case 'stasis_end':
    case 'channel_destroyed':
      return updateLiveCall(snapshot, event.channelId, (call) => ({ ...call, phase: 'ended' }));
    case 'transfer_started':
      return updateLiveCall(snapshot, event.channelId, (call) => ({
        ...call,
        phase: 'transferring',
        transferReason: event.reason
      }));
    case 'transfer_completed':
      return updateLiveCall(snapshot, event.channelId, (call) => ({
        ...call,
        phase: 'transferred',
        transferReason: event.reason
      }));
    case 'transfer_failed':
      return finishFailedTransfer(snapshot, event.channelId);
    case 'media':
      return updateLiveCall(snapshot, event.channelId, (call) => ({
        ...call,
        mediaStatus: event.status,
        mediaPath: event.mediaPath
      }));
    case 'speech':
      return applySpeech(snapshot, event);
    default: {
      const unexpected: never = event;
      throw new Error(`Unhandled Asterisk event: ${JSON.stringify(unexpected)}`);
    }
  }
}

function finishFailedTransfer(snapshot: AsteriskSnapshot, channelId: string): AsteriskSnapshot {
  return updateLiveCall(snapshot, channelId, (call) => (
    call.phase === 'transferring' ? { ...call, phase: 'active' } : call
  ));
}

export function parseAriMessage(value: unknown): AsteriskDomainEvent | null {
  const record = asRecord(value);
  const channel = record ? readAriChannel(record.channel) : null;
  const type = record?.type;
  if (type === 'StasisStart' && channel) {
    return {
      type: 'stasis_start',
      channelId: channel.id,
      callerNumber: channel.callerNumber,
      startedAt: channel.startedAt,
      channelState: channel.state
    };
  }
  if (type === 'ChannelStateChange' && channel) {
    return { type: 'channel_state', channelId: channel.id, state: channel.state };
  }
  if ((type === 'StasisEnd' || type === 'ChannelDestroyed') && channel) {
    return type === 'StasisEnd'
      ? { type: 'stasis_end', channelId: channel.id }
      : { type: 'channel_destroyed', channelId: channel.id };
  }
  return null;
}

export function ariEventsWebSocketUrl(ariHttpUrl: string, app: string, username: string, password: string): string {
  const url = new URL(ariHttpUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  const basePath = url.pathname.replace(/\/$/, '');
  url.pathname = `${basePath}/events`;
  url.searchParams.set('app', app);
  url.searchParams.set('api_key', `${username}:${password}`);
  return url.toString();
}

export function isSafeAriToken(value: string): boolean {
  return /^[A-Za-z0-9_.:/@+-]{1,80}$/.test(value);
}

export function maskCallerNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 4) {
    return 'приховано';
  }
  return `…${digits.slice(-4)}`;
}

export function describeCallPhase(phase: AsteriskCallPhase): string {
  switch (phase) {
    case 'ringing':
      return 'дзвінок';
    case 'active':
      return 'розмова';
    case 'transferring':
      return 'передача';
    case 'transferred':
      return 'передано оператору';
    case 'ended':
      return 'завершено';
    case 'interrupted':
      return 'звʼязок перервано';
    default: {
      const unexpected: never = phase;
      return unexpected;
    }
  }
}

export function describeAsteriskLink(snapshot: AsteriskSnapshot): { title: string; detail: string; tone: AsteriskBadgeTone } {
  const call = snapshot.activeCall;
  const detail = call
    ? `${call.rawCallerNumber || call.callerNumber || 'номер приховано'} · ${describeCallPhase(call.phase)}`
    : snapshot.message;
  return {
    title: linkTitle(snapshot),
    detail,
    tone: linkTone(snapshot)
  };
}

export function readAsteriskSnapshot(value: unknown): AsteriskSnapshot | null {
  const record = asRecord(value);
  if (!record || !isMode(record.mode) || !isLink(record.link) || !isMediaMode(record.mediaMode)) {
    return null;
  }
  const message = typeof record.message === 'string' ? record.message : '';
  const operatorEndpoint = typeof record.operatorEndpoint === 'string' ? record.operatorEndpoint : '';
  return {
    mode: record.mode,
    link: record.link,
    activeCall: readCall(record.activeCall),
    operatorEndpoint,
    mediaMode: record.mediaMode,
    message
  };
}

export function unreachableSnapshot(): AsteriskSnapshot {
  return {
    mode: 'unavailable',
    link: 'disconnected',
    activeCall: null,
    operatorEndpoint: '',
    mediaMode: CONTROL_PLANE,
    message: `Міст Asterisk не відповідає. ${MANUAL_REGISTRATION}`
  };
}

function resolveMode(env: Record<string, string | undefined>): AsteriskBridgeMode {
  const requested = (env.ASTERISK_MODE ?? '').trim();
  if (requested === 'off') {
    return 'unavailable';
  }
  if (requested === 'simulate') {
    return 'simulate';
  }
  if (readAriCredentials(env)) {
    return 'ari';
  }
  return 'unavailable';
}

function bridgeMessage(mode: AsteriskBridgeMode, mediaMode: PublicBridgeConfig['mediaMode']): string {
  const mediaNote = mediaMode === EXTERNAL_MEDIA
    ? 'Аудіо йде на зовнішній media host і не зберігається у WSN.'
    : 'Керування викликом без запису аудіо у WSN.';
  switch (mode) {
    case 'simulate':
      return `Симулятор: це не живий транк. ${mediaNote} ${MANUAL_REGISTRATION}`;
    case 'ari':
      return `${mediaNote} ${MANUAL_REGISTRATION}`;
    case 'unavailable':
      return `Asterisk не налаштований. ${MANUAL_REGISTRATION}`;
    default: {
      const unexpected: never = mode;
      return unexpected;
    }
  }
}

function applyStasisStart(
  snapshot: AsteriskSnapshot,
  event: Extract<AsteriskDomainEvent, { type: 'stasis_start' }>
): AsteriskSnapshot {
  if (isLiveCall(snapshot.activeCall)) {
    return snapshot;
  }
  return {
    ...snapshot,
    link: 'connected',
    activeCall: {
      id: event.channelId,
      callerNumber: normalizeCallerNumber(event.callerNumber),
      rawCallerNumber: event.callerNumber.trim(),
      startedAt: event.startedAt,
      phase: phaseFromChannelState(event.channelState),
      transferReason: null,
      handoffRequested: false,
      mediaStatus: snapshot.mediaMode === EXTERNAL_MEDIA ? 'pending' : 'not_configured',
      mediaPath: null
    }
  };
}

function applySpeech(
  snapshot: AsteriskSnapshot,
  event: Extract<AsteriskDomainEvent, { type: 'speech' }>
): AsteriskSnapshot {
  if (!detectHandoffRequest(event.text)) {
    return snapshot;
  }
  return updateLiveCall(snapshot, event.channelId, (call) => ({ ...call, handoffRequested: true }));
}

function applyDisconnect(snapshot: AsteriskSnapshot): AsteriskSnapshot {
  const activeCall = snapshot.activeCall && isLiveCall(snapshot.activeCall)
    ? { ...snapshot.activeCall, phase: 'interrupted' as const }
    : snapshot.activeCall;
  return {
    ...snapshot,
    link: 'reconnecting',
    activeCall,
    message: `Звʼязок з Asterisk перервано. ${MANUAL_REGISTRATION}`
  };
}

function applyResync(
  snapshot: AsteriskSnapshot,
  event: Extract<AsteriskDomainEvent, { type: 'resync' }>
): AsteriskSnapshot {
  if (!snapshot.activeCall || snapshot.activeCall.id !== event.channelId) {
    return applyStasisStart(snapshot, {
      type: 'stasis_start',
      channelId: event.channelId,
      callerNumber: event.callerNumber,
      startedAt: event.startedAt,
      channelState: event.state
    });
  }
  if (snapshot.activeCall.phase !== 'interrupted') {
    return snapshot;
  }
  return {
    ...snapshot,
    link: 'connected',
    activeCall: { ...snapshot.activeCall, phase: phaseFromChannelState(event.state) }
  };
}

function updateLiveCall(
  snapshot: AsteriskSnapshot,
  channelId: string,
  update: (call: AsteriskCall) => AsteriskCall
): AsteriskSnapshot {
  if (!snapshot.activeCall || snapshot.activeCall.id !== channelId) {
    return snapshot;
  }
  return { ...snapshot, activeCall: update(snapshot.activeCall) };
}

function phaseFromChannelState(state: string): AsteriskCallPhase {
  return state.toLowerCase() === 'up' ? 'active' : 'ringing';
}

function linkTitle(snapshot: AsteriskSnapshot): string {
  if (snapshot.mode === 'simulate') {
    return 'Симулятор Asterisk';
  }
  if (snapshot.mode === 'unavailable') {
    return 'Asterisk недоступний';
  }
  switch (snapshot.link) {
    case 'connected':
      return 'Asterisk підключено';
    case 'connecting':
      return 'Підключення до Asterisk';
    case 'reconnecting':
      return 'Відновлення звʼязку з Asterisk';
    case 'disconnected':
      return 'Asterisk недоступний';
    default: {
      const unexpected: never = snapshot.link;
      return unexpected;
    }
  }
}

function linkTone(snapshot: AsteriskSnapshot): AsteriskBadgeTone {
  if (snapshot.mode === 'simulate') {
    return 'warn';
  }
  if (snapshot.mode === 'unavailable' || snapshot.link === 'disconnected') {
    return 'muted';
  }
  if (snapshot.link === 'connected') {
    return 'ok';
  }
  return 'warn';
}

function readCall(value: unknown): AsteriskCall | null {
  const record = asRecord(value);
  if (!isCallRecord(record)) {
    return null;
  }
  return {
    id: record.id,
    callerNumber: readString(record, 'callerNumber'),
    rawCallerNumber: readString(record, 'rawCallerNumber'),
    startedAt: readString(record, 'startedAt'),
    phase: record.phase,
    transferReason: readTransferReason(record.transferReason),
    handoffRequested: record.handoffRequested === true,
    mediaStatus: record.mediaStatus,
    mediaPath: readNullableString(record.mediaPath)
  };
}

function isCallRecord(record: Record<string, unknown> | null): record is Record<string, unknown> & {
  id: string;
  phase: AsteriskCallPhase;
  mediaStatus: AsteriskMediaStatus;
} {
  return Boolean(record && typeof record.id === 'string' && isPhase(record.phase) && isMediaStatus(record.mediaStatus));
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

function readNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readTransferReason(value: unknown): AsteriskTransferReason | null {
  if (value === null || isTransferReason(value)) {
    return value;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function readAriChannel(value: unknown): { id: string; callerNumber: string; startedAt: string; state: string } | null {
  const channel = asRecord(value);
  if (!channel || typeof channel.id !== 'string' || !channel.id.trim()) {
    return null;
  }
  const caller = asRecord(channel.caller);
  const callerNumber = typeof caller?.number === 'string' ? caller.number : '';
  const startedAt = typeof channel.creationtime === 'string' ? channel.creationtime : '';
  const state = typeof channel.state === 'string' ? channel.state : 'Ring';
  return { id: channel.id, callerNumber, startedAt, state };
}

function isMode(value: unknown): value is AsteriskBridgeMode {
  return value === 'ari' || value === 'simulate' || value === 'unavailable';
}

function isLink(value: unknown): value is AsteriskLinkState {
  return value === 'disconnected' || value === 'connecting' || value === 'connected' || value === 'reconnecting';
}

function isPhase(value: unknown): value is AsteriskCallPhase {
  return value === 'ringing' || value === 'active' || value === 'transferring'
    || value === 'transferred' || value === 'ended' || value === 'interrupted';
}

function isMediaStatus(value: unknown): value is AsteriskMediaStatus {
  return value === 'not_configured' || value === 'pending' || value === 'attached' || value === 'failed';
}

function isMediaMode(value: unknown): value is AsteriskSnapshot['mediaMode'] {
  return value === CONTROL_PLANE || value === EXTERNAL_MEDIA;
}

function isTransferReason(value: unknown): value is AsteriskTransferReason {
  return value === 'operator' || value === 'subscriber_request' || value === 'dialogue_failed';
}
