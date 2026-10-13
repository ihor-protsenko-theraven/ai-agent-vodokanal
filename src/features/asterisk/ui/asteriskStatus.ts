import {
  AsteriskBadgeTone,
  AsteriskSnapshot,
  canTransferCall,
  describeAsteriskLink
} from '@/features/asterisk/domain/asteriskModel';
import { escapeHtml } from '@/shared/utils/security';

export interface InterceptButtonView {
  label: string;
  pressed: boolean;
  disabled: boolean;
  className: string;
  liveCall: boolean;
}

const BUTTON_CLASS = 'w-full sm:w-auto px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0';

export function interceptButtonView(snapshot: AsteriskSnapshot, localIntercept: boolean): InterceptButtonView {
  const call = snapshot.activeCall;
  if (call?.phase === 'transferred') {
    return {
      label: 'Розмову передано оператору',
      pressed: true,
      disabled: true,
      liveCall: false,
      className: `${BUTTON_CLASS} bg-amber-600 text-white ring-2 ring-amber-400/50 cursor-default`
    };
  }
  if (call?.phase === 'transferring') {
    return {
      label: 'Передача оператору…',
      pressed: true,
      disabled: true,
      liveCall: true,
      className: `${BUTTON_CLASS} bg-amber-700 text-white cursor-wait`
    };
  }
  if (canTransferCall(call)) {
    return {
      label: 'Перехопити розмову',
      pressed: false,
      disabled: false,
      liveCall: true,
      className: `${BUTTON_CLASS} bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20`
    };
  }
  if (localIntercept) {
    return {
      label: 'Повернути AI-агенту',
      pressed: true,
      disabled: false,
      liveCall: false,
      className: `${BUTTON_CLASS} bg-amber-600 hover:bg-amber-500 text-white ring-2 ring-amber-400/50`
    };
  }
  return {
    label: 'Перехопити розмову',
    pressed: false,
    disabled: false,
    liveCall: false,
    className: `${BUTTON_CLASS} bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20`
  };
}

export function applyInterceptButton(container: ParentNode, view: InterceptButtonView): void {
  const button = container.querySelector<HTMLButtonElement>('#btn-intercept-call');
  const label = container.querySelector('#text-intercept-call');
  if (!button || !label) {
    return;
  }
  button.className = view.className;
  button.disabled = view.disabled;
  button.dataset.liveCall = view.liveCall ? 'true' : 'false';
  button.setAttribute('aria-pressed', view.pressed ? 'true' : 'false');
  label.textContent = view.label;
}

export function asteriskBadgeMarkup(snapshot: AsteriskSnapshot): string {
  const badge = describeAsteriskLink(snapshot);
  const dot = badgeDotClass(badge.tone);
  return `
    <div class="flex items-center gap-2 shrink-0" title="${escapeHtml(snapshot.message)}">
      <span class="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
        <span class="${dot} animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"></span>
        <span class="${dot} relative inline-flex rounded-full h-2.5 w-2.5"></span>
      </span>
      <span class="text-[10px] md:text-xs font-medium text-slate-300">${escapeHtml(badge.title)}</span>
    </div>
    <div class="text-[10px] md:text-xs text-slate-400 shrink-0 max-w-[240px] truncate">${escapeHtml(badge.detail)}</div>
  `;
}

function badgeDotClass(tone: AsteriskBadgeTone): string {
  switch (tone) {
    case 'ok':
      return 'bg-emerald-500';
    case 'warn':
      return 'bg-amber-500';
    case 'muted':
      return 'bg-slate-500';
    default: {
      const unexpected: never = tone;
      return unexpected;
    }
  }
}

export function syncAsteriskSimulator(container: ParentNode, snapshot: AsteriskSnapshot, statusNote: string): void {
  const host = container.querySelector<HTMLElement>('#asterisk-simulator');
  if (!host) {
    return;
  }
  const signature = simulatorSignature(snapshot, statusNote);
  if (host.dataset.signature === signature) {
    return;
  }
  host.dataset.signature = signature;
  paintSimulator(host, snapshot, statusNote);
}

function simulatorSignature(snapshot: AsteriskSnapshot, statusNote: string): string {
  const call = snapshot.activeCall;
  return [snapshot.mode, call?.id ?? '', call?.phase ?? '', statusNote].join('|');
}

function paintSimulator(host: HTMLElement, snapshot: AsteriskSnapshot, statusNote: string): void {
  if (snapshot.mode !== 'simulate') {
    host.classList.add('hidden');
    host.replaceChildren();
    return;
  }
  host.classList.remove('hidden');
  host.innerHTML = simulatorMarkup(snapshot, statusNote);
}

function simulatorMarkup(snapshot: AsteriskSnapshot, statusNote: string): string {
  const live = isSimulatorCallLive(snapshot);
  const callButton = live ? 'disabled' : '';
  const hangupButton = live ? '' : 'disabled';
  const note = statusNote
    ? `<p id="asterisk-sim-note" class="text-[11px] text-rose-300">${escapeHtml(statusNote)}</p>`
    : '';
  return `
    <div class="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 flex flex-col gap-2">
      <p class="text-[11px] font-semibold text-amber-200">Симулятор Asterisk. Це не живий транк.</p>
      <div class="flex flex-col sm:flex-row gap-2">
        <label class="flex-1 text-[10px] text-slate-300">
          Номер абонента
          <input id="asterisk-sim-number" value="+380501112233" class="mt-1 w-full bg-slate-950 text-xs rounded-lg border border-slate-700 text-slate-100 p-2" />
        </label>
        <button id="btn-asterisk-sim-call" type="button" ${callButton} class="self-end px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 disabled:bg-slate-700 disabled:text-slate-400">Імітувати дзвінок</button>
        <button id="btn-asterisk-sim-hangup" type="button" ${hangupButton} class="self-end px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-100 border border-slate-600 disabled:text-slate-500">Завершити</button>
      </div>
      ${note}
    </div>
  `;
}

function isSimulatorCallLive(snapshot: AsteriskSnapshot): boolean {
  const call = snapshot.activeCall;
  return call !== null && call.phase !== 'ended';
}
