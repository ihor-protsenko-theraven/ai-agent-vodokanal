import {
  AsteriskCallDraft,
  AsteriskSnapshot,
  AsteriskTransferReason,
  canTransferCall,
  detectHandoffRequest,
  readAsteriskSnapshot,
  unreachableSnapshot
} from '@/features/asterisk/domain/asteriskModel';

export interface AsteriskSink {
  applyCall(call: AsteriskCallDraft): void;
  setIntercepted(value: boolean): void;
  readTranscript(): string;
  readOperatorId(): string;
}

const STATUS_PATH = '/api/asterisk/status';
const EVENTS_PATH = '/api/asterisk/events';
const POLL_INTERVAL_MS = 5000;

export class AsteriskSession {
  private snapshot: AsteriskSnapshot = unreachableSnapshot();
  private listeners = new Set<() => void>();
  private running = false;
  private source: EventSource | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private handoffSentFor = new Set<string>();
  private transferInFlight = false;
  private statusNote = '';
  private readonly sink: AsteriskSink;
  private readonly fetchImpl: typeof fetch;

  constructor(sink: AsteriskSink, fetchImpl?: typeof fetch) {
    this.sink = sink;
    this.fetchImpl = fetchImpl ?? ((input, init) => globalThis.fetch(input, init));
  }

  public getSnapshot(): AsteriskSnapshot {
    return this.snapshot;
  }

  public getStatusNote(): string {
    return this.statusNote;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    void this.refresh();
    this.pollTimer = setInterval(() => {
      void this.refresh();
    }, POLL_INTERVAL_MS);
  }

  public stop(): void {
    this.running = false;
    this.source?.close();
    this.source = null;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  public acceptSnapshot(snapshot: AsteriskSnapshot): void {
    const unchanged = JSON.stringify(this.snapshot) === JSON.stringify(snapshot);
    this.snapshot = snapshot;
    this.reapplyActiveCall();
    this.considerTranscript(this.sink.readTranscript());
    if (!unchanged) {
      this.emit();
    }
  }

  public reapplyActiveCall(): void {
    const call = this.snapshot.activeCall;
    if (!call || call.phase === 'ended') {
      return;
    }
    this.sink.applyCall({
      id: call.id,
      callerNumber: call.callerNumber,
      startedAt: call.startedAt
    });
    if (call.phase === 'transferred') {
      this.sink.setIntercepted(true);
    }
  }

  public considerTranscript(text: string): void {
    const call = this.snapshot.activeCall;
    if (!call || !canTransferCall(call) || this.handoffSentFor.has(call.id) || !detectHandoffRequest(text)) {
      return;
    }
    this.handoffSentFor.add(call.id);
    void this.transfer('subscriber_request').then((accepted) => {
      if (!accepted) {
        this.handoffSentFor.delete(call.id);
      }
    });
  }

  public async transfer(reason: AsteriskTransferReason): Promise<boolean> {
    const call = this.snapshot.activeCall;
    if (!call || !canTransferCall(call) || this.transferInFlight) {
      return false;
    }
    this.transferInFlight = true;
    try {
      const response = await this.fetchImpl(`/api/asterisk/calls/${encodeURIComponent(call.id)}/transfer`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason, operatorId: this.sink.readOperatorId() })
      });
      return await this.acceptResponse(response, 'Не вдалося передати виклик оператору.');
    } catch {
      this.setStatusNote('Не вдалося передати виклик оператору.');
      return false;
    } finally {
      this.transferInFlight = false;
    }
  }

  public async simulateIncoming(callerNumber: string): Promise<boolean> {
    return this.postSnapshot('/api/asterisk/simulate/calls', { callerNumber }, 'Не вдалося імітувати вхідний дзвінок.');
  }

  public async simulateHangup(): Promise<boolean> {
    const call = this.snapshot.activeCall;
    if (!call) {
      return false;
    }
    return this.postSnapshot(
      `/api/asterisk/simulate/calls/${encodeURIComponent(call.id)}/hangup`,
      {},
      'Не вдалося завершити імітований дзвінок.'
    );
  }

  private async refresh(): Promise<void> {
    if (!this.running) {
      return;
    }
    this.openEvents();
    try {
      const response = await this.fetchImpl(STATUS_PATH);
      if (!response.ok) {
        this.notePollFailure();
        return;
      }
      const snapshot = readAsteriskSnapshot(await response.json());
      if (!snapshot) {
        this.notePollFailure();
        return;
      }
      this.setStatusNote('');
      this.acceptSnapshot(snapshot);
    } catch (error) {
      console.error('Asterisk status poll failed:', error instanceof Error ? error.message : 'unknown');
      this.notePollFailure();
    }
  }

  private notePollFailure(): void {
    this.setStatusNote('Міст Asterisk не відповідає. Ручна реєстрація заявки доступна.');
  }

  private openEvents(): void {
    if (this.source || typeof EventSource !== 'function') {
      return;
    }
    this.source = new EventSource(EVENTS_PATH);
    this.source.onmessage = (event: MessageEvent<string>) => {
      this.readEventPayload(event.data);
    };
    this.source.onerror = () => {
      this.source?.close();
      this.source = null;
    };
  }

  private readEventPayload(payload: string): void {
    try {
      const snapshot = readAsteriskSnapshot(JSON.parse(payload));
      if (snapshot) {
        this.acceptSnapshot(snapshot);
      }
    } catch {
      this.setStatusNote('Подія Asterisk має невірний формат.');
    }
  }

  private async postSnapshot(path: string, body: unknown, failureNote: string): Promise<boolean> {
    try {
      const response = await this.fetchImpl(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      return await this.acceptResponse(response, failureNote);
    } catch {
      this.setStatusNote(failureNote);
      return false;
    }
  }

  private async acceptResponse(response: Response, failureNote: string): Promise<boolean> {
    const snapshot = readAsteriskSnapshot(await response.json().catch(() => null));
    if (snapshot) {
      this.acceptSnapshot(snapshot);
    }
    if (!response.ok) {
      this.setStatusNote(failureNote);
      return false;
    }
    this.setStatusNote('');
    return true;
  }

  private setStatusNote(note: string): void {
    if (this.statusNote === note) {
      return;
    }
    this.statusNote = note;
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('Asterisk session listener failed:', error);
      }
    });
  }
}

let installed: AsteriskSession | null = null;

export function installAsteriskSession(sink: AsteriskSink, fetchImpl?: typeof fetch): AsteriskSession {
  installed?.stop();
  installed = new AsteriskSession(sink, fetchImpl);
  return installed;
}

export function getAsteriskSession(): AsteriskSession {
  if (!installed) {
    throw new Error('Asterisk session is not installed');
  }
  return installed;
}
