import { TicketStateStore } from '../services/TicketStateStore';
import { MOCK_SCENARIOS } from '../mock/mockData';
import { escapeHtml } from '../utils/security';
import { aiConfig, appConfig, wsnConfig } from '../config';

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
    const isPreparingNewTicket = this.store.getIsPreparingNewTicket();
    const unclosedTicketsCount = this.store.getUnclosedTickets().length;
    const isUnclosedTicketsPanelOpen = this.store.getIsUnclosedTicketsPanelOpen();
    const currentUser = this.store.getCurrentUser();

    this.container.innerHTML = `
      <header class="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-3 sm:px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3 md:gap-4 sticky top-0 z-30 shadow-lg shadow-black/20">
        <!-- Logo & Branding -->
        <div class="flex items-center gap-2 sm:gap-3 order-1 min-w-0">
          <div class="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-sky-500 to-vodokanal-700 flex items-center justify-center shadow-md shadow-sky-500/20 ring-1 ring-sky-400/30 shrink-0">
            <svg class="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
            </svg>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <h1 class="text-sm sm:text-base md:text-lg font-bold text-white tracking-wide leading-tight">${appConfig.TITLE}</h1>
              <span class="bg-sky-500/20 text-sky-300 text-[9px] sm:text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 rounded border border-sky-500/30 shrink-0">${appConfig.VERSION_LABEL}</span>
              ${aiConfig.MODE === 'local' ? '<span class="bg-amber-500/15 text-amber-300 text-[9px] sm:text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 rounded border border-amber-500/30 shrink-0">Локальний AI</span>' : ''}
            </div>
            <p class="text-[9px] sm:text-[10px] md:text-xs text-slate-400 truncate max-w-[160px] sm:max-w-[200px] md:max-w-none">${appConfig.SUBTITLE}</p>
          </div>
        </div>

        <!-- Scenario Switcher & Logout Button -->
        <div class="flex items-center gap-2 md:gap-3 order-2 xl:order-3 shrink-0 ml-auto">
          <button id="btn-new-ticket" ${isPreparingNewTicket ? 'disabled' : ''} class="py-1 px-1.5 sm:py-1.5 sm:px-2 md:py-2 md:px-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-400 text-white text-[10px] md:text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-wait shrink-0">
            <span>${isPreparingNewTicket ? 'Підготовка…' : 'Нова заявка'}</span>
          </button>
          <button id="btn-unclosed-tickets" aria-expanded="${isUnclosedTicketsPanelOpen}" class="py-1 px-1.5 sm:py-1.5 sm:px-2 md:py-2 md:px-3 ${isUnclosedTicketsPanelOpen ? 'bg-sky-500/20 border-sky-500/60 text-sky-200' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'} border text-[10px] md:text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0">
            <span>Незакриті</span>
            ${unclosedTicketsCount > 0 ? `<span class="min-w-4 px-1 rounded bg-slate-950/70 text-sky-300 font-mono">${unclosedTicketsCount}</span>` : ''}
          </button>
          <div class="flex items-center gap-1.5 sm:gap-2">
            <label for="scenario-select" class="text-[10px] md:text-xs text-slate-400 font-medium hidden sm:inline whitespace-nowrap">Сценарій ТЗ:</label>
            <select id="scenario-select" class="bg-slate-800 text-slate-200 text-[10px] sm:text-xs rounded-lg border border-slate-700 px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 max-w-[90px] sm:max-w-[140px] md:max-w-xs focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer truncate">
              ${MOCK_SCENARIOS.map(s => `
                <option value="${escapeHtml(s.id)}" class="bg-slate-800 text-slate-200" ${s.id === activeScenarioId ? 'selected' : ''}>
                  ${escapeHtml(s.name)}
                </option>
              `).join('')}
            </select>
          </div>

          <button id="btn-logout" class="py-1 px-1.5 sm:py-1.5 sm:px-2 md:py-2 md:px-3 bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/60 text-slate-300 hover:text-rose-300 text-[10px] md:text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0">
            <svg class="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            <span class="hidden sm:inline whitespace-nowrap">Вийти</span>
          </button>
        </div>

        <!-- Call Metadata & Asterisk Badge -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-start xl:justify-center gap-2 sm:gap-3 md:gap-4 bg-slate-950/60 px-3 md:px-4 py-2 rounded-xl border border-slate-800/80 order-3 xl:order-2 w-full xl:w-auto shrink-0 shadow-inner">
          <div class="flex items-center gap-2 shrink-0">
            <span class="relative flex h-2.5 w-2.5 shrink-0">
              <span class="${isIntercepted ? 'bg-amber-400' : 'bg-emerald-400'} animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"></span>
              <span class="${isIntercepted ? 'bg-amber-500' : 'bg-emerald-500'} relative inline-flex rounded-full h-2.5 w-2.5"></span>
            </span>
            <span class="text-[10px] md:text-xs font-medium text-slate-300">
              ${isIntercepted ? 'Розмова перехоплена' : 'Голосовий потік Asterisk'}
            </span>
          </div>

          <div class="h-3 md:h-4 w-[1px] bg-slate-800 shrink-0 hidden sm:block"></div>

          <div class="text-[10px] md:text-xs shrink-0 flex items-center">
            <span class="text-slate-400">Call ID:</span>
            <span class="font-mono font-semibold text-sky-400 ml-1 break-all">${escapeHtml(result.callId)}</span>
          </div>

          <div class="h-3 md:h-4 w-[1px] bg-slate-800 shrink-0 hidden sm:block"></div>

          <div class="text-[10px] md:text-xs flex items-center gap-1.5 shrink-0">
            <span class="text-slate-400">Користувач:</span>
            <span class="font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30 truncate max-w-[200px] sm:max-w-none">
              ${escapeHtml(currentUser?.displayName || wsnConfig.OPERATOR_DISPLAY)}
            </span>
          </div>
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

    const newTicketButton = this.container.querySelector<HTMLButtonElement>('#btn-new-ticket');
    if (newTicketButton) {
      newTicketButton.addEventListener('click', async () => {
        const created = await this.store.createNewTicket();
        if (!created) {
          alert('Не вдалося підготувати шаблон нової заявки. Перевірте підключення до Forland.');
        }
      });
    }

    const unclosedTicketsButton = this.container.querySelector<HTMLButtonElement>('#btn-unclosed-tickets');
    if (unclosedTicketsButton) {
      unclosedTicketsButton.addEventListener('click', () => void this.store.toggleUnclosedTicketsPanel());
    }

    const btnLogout = this.container.querySelector('#btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        await this.store.logout();
      });
    }
  }
}
