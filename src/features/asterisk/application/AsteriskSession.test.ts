import { afterEach, describe, expect, it, vi } from 'vitest';
import { AsteriskCallDraft, AsteriskSnapshot } from '@/features/asterisk/domain/asteriskModel';
import { AsteriskSession, AsteriskSink } from './AsteriskSession';

const activeSnapshot: AsteriskSnapshot = {
  mode: 'simulate',
  link: 'connected',
  operatorEndpoint: 'PJSIP/100',
  mediaMode: 'control-plane',
  message: 'Симулятор',
  activeCall: {
    id: 'SIM-1',
    callerNumber: '+380501112233',
    rawCallerNumber: '0501112233',
    startedAt: '2026-10-13T08:15:00.000Z',
    phase: 'ringing',
    transferReason: null,
    handoffRequested: false,
    mediaStatus: 'not_configured',
    mediaPath: null
  }
};

function transferredSnapshot(): AsteriskSnapshot {
  return {
    ...activeSnapshot,
    activeCall: activeSnapshot.activeCall
      ? { ...activeSnapshot.activeCall, phase: 'transferred', transferReason: 'subscriber_request' }
      : null
  };
}

describe('AsteriskSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('applies the caller to the draft and transfers once when speech asks for an operator', async () => {
    const applied: AsteriskCallDraft[] = [];
    let intercepted = false;
    let transcript = '';
    const requests: Array<{ url: string; body: string }> = [];
    const sink: AsteriskSink = {
      applyCall: (call) => applied.push(call),
      setIntercepted: (value) => {
        intercepted = value;
      },
      readTranscript: () => transcript,
      readOperatorId: () => 'OPERATOR-402'
    };
    const session = new AsteriskSession(sink, vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: String(input), body: String(init?.body ?? '') });
      return new Response(JSON.stringify(transferredSnapshot()), { status: 200 });
    }) as typeof fetch);

    session.acceptSnapshot(activeSnapshot);
    expect(applied).toEqual([{
      id: 'SIM-1',
      callerNumber: '+380501112233',
      startedAt: '2026-10-13T08:15:00.000Z'
    }]);

    transcript = "абонент: з'єднайте з оператором";
    session.considerTranscript(transcript);
    session.considerTranscript(transcript);
    await vi.waitFor(() => expect(intercepted).toBe(true));
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe('/api/asterisk/calls/SIM-1/transfer');
    expect(JSON.parse(requests[0]?.body ?? '{}')).toEqual({
      reason: 'subscriber_request',
      operatorId: 'OPERATOR-402'
    });
  });

  it('shows an unavailable bridge without blocking a later manual retry', async () => {
    const session = new AsteriskSession({
      applyCall: () => undefined,
      setIntercepted: () => undefined,
      readTranscript: () => '',
      readOperatorId: () => 'OPERATOR-402'
    }, vi.fn(async () => new Response('nope', { status: 503 })) as typeof fetch);

    const accepted = await session.simulateIncoming('0501112233');
    expect(accepted).toBe(false);
    expect(session.getStatusNote()).toContain('імітувати');
    expect(session.getSnapshot().mode).toBe('unavailable');
  });
});
