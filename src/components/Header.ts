import { TicketStateStore } from '../services/TicketStateStore';
import { MOCK_SCENARIOS } from '../mock/mockData';
import { escapeHtml } from '../utils/security';
import { CONFIG } from '../config/constants';

export class HeaderComponent {
  private store: TicketStateStore;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.store = TicketStateStore.getInstance();
  }

  public render(): void {
    const result = this.store.getResult();
    const activeScenarioId = this.store.getActiveScenarioId();
    const isIntercepted = this.store.getCallIntercepted();
    const currentUser = this.store.getCurrentUser();

    this.container.innerHTML = `
      <header class="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-lg shadow-black/20">
        <!-- Logo & Branding -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-vodokanal-700 flex items-center justify-center shadow-md shadow-sky-500/20 ring-1 ring-sky-400/30">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg font-bold text-white tracking-wide">${CONFIG.APP.TITLE}</h1>
              <span class="bg-sky-500/20 text-sky-300 text-xs font-semibold px-2 py-0.5 rounded border border-sky-500/30">${CONFIG.APP.VERSION_LABEL}</span>
            </div>
            <p class="text-xs text-slate-400">${CONFIG.APP.SUBTITLE}</p>
          </div>
        </div>

        <!-- Call Metadata & Asterisk Badge -->
        <div class="flex items-center gap-4 bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-800/80">
          <div class="flex items-center gap-2">
            <span class="relative flex h-2.5 w-2.5">
              <span class="${isIntercepted ? 'bg-amber-400' : 'bg-emerald-400'} animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"></span>
              <span class="${isIntercepted ? 'bg-amber-500' : 'bg-emerald-500'} relative inline-flex rounded-full h-2.5 w-2.5"></span>
            </span>
            <span class="text-xs font-medium text-slate-300">
              ${isIntercepted ? 'Розмова перехоплена' : 'Голосовий потік Asterisk'}
            </span>
          </div>

          <div class="h-4 w-[1px] bg-slate-800"></div>

          <div class="text-xs">
            <span class="text-slate-400">Call ID:</span>
            <span class="font-mono font-semibold text-sky-400 ml-1">${escapeHtml(result.callId)}</span>
          </div>

          <div class="h-4 w-[1px] bg-slate-800"></div>

          <div class="text-xs flex items-center gap-1.5">
            <span class="text-slate-400">Користувач:</span>
            <span class="font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
              ${escapeHtml(currentUser?.displayName || CONFIG.WSN.OPERATOR_DISPLAY)}
            </span>
          </div>
        </div>

        <!-- Scenario Switcher & Logout Button -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <label for="scenario-select" class="text-xs text-slate-400 font-medium hidden sm:inline">Сценарій ТЗ:</label>
            <select id="scenario-select" class="bg-slate-800 text-slate-200 text-xs rounded-lg border border-slate-700 px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer">
              ${MOCK_SCENARIOS.map(s => `
                <option value="${escapeHtml(s.id)}" ${s.id === activeScenarioId ? 'selected' : ''}>
                  ${escapeHtml(s.name)}
                </option>
              `).join('')}
            </select>
          </div>

          <button id="btn-logout" class="py-2 px-3 bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/60 text-slate-300 hover:text-rose-300 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            <span>Вийти</span>
          </button>
        </div>
      </header>
    `;

    this.attachEvents();
  }

  private attachEvents(): void {
    const select = this.container.querySelector<HTMLSelectElement>('#scenario-select');
    if (select) {
      select.addEventListener('change', (e) => {
        const val = (e.target as HTMLSelectElement).value;
        this.store.loadScenario(val);
      });
    }

    const btnLogout = this.container.querySelector('#btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        this.store.logout();
      });
    }
  }
}
