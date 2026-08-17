import { TicketStateStore } from '../services/TicketStateStore';
import { escapeHtml } from '../utils/security';

function formatUpdatedAt(value: Date | null): string {
  if (!value) {
    return 'Ще не завантажено';
  }

  return new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(value);
}

function formatCreatedAt(value: string | undefined): string {
  if (!value) return 'Дата створення не надана';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Дата створення не надана';
  return new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

export class UnclosedTicketsPanelComponent {
  private store: TicketStateStore;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.store = TicketStateStore.getInstance();
  }

  public render(): void {
    if (!this.store.getIsUnclosedTicketsPanelOpen()) {
      this.container.innerHTML = '';
      return;
    }

    const tickets = this.store.getSortedUnclosedTickets();
    const sort = this.store.getUnclosedTicketsSort();
    const isLoading = this.store.getIsLoadingUnclosedTickets();
    const error = this.store.getUnclosedTicketsError();
    const updatedAt = formatUpdatedAt(this.store.getUnclosedTicketsUpdatedAt());

    this.container.innerHTML = `
      <div class="fixed inset-0 z-40 bg-slate-950/60" data-close-unclosed-panel></div>
      <aside role="dialog" aria-modal="true" aria-label="Незакриті заявки WSN" class="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl">
        <div class="p-4 border-b border-slate-800 flex items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-white">Незакриті заявки WSN</h2>
            <p class="text-xs text-slate-400 mt-1">Клас 27772 · активні стани · відсортовано за датою створення</p>
          </div>
          <button id="btn-close-unclosed-panel" aria-label="Закрити список заявок" class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
          <p class="text-[11px] text-slate-400">Оновлено список: <span class="text-slate-200">${escapeHtml(updatedAt)}</span></p>
          <div class="flex items-center gap-2">
            <select id="select-unclosed-sort" aria-label="Сортування заявок за датою створення" class="bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500">
              <option value="newest" ${sort === 'newest' ? 'selected' : ''}>Спочатку новіші</option>
              <option value="oldest" ${sort === 'oldest' ? 'selected' : ''}>Спочатку старіші</option>
            </select>
            <button id="btn-refresh-unclosed-tickets" ${isLoading ? 'disabled' : ''} class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-400 text-white transition-all">
              ${isLoading ? 'Оновлення…' : 'Оновити'}
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          ${error ? `
            <div class="rounded-xl border border-rose-500/60 bg-rose-950/40 p-3 text-xs text-rose-200">${escapeHtml(error)}</div>
          ` : ''}

          ${isLoading && tickets.length === 0 ? `
            <p class="text-sm text-slate-400 text-center py-8">Завантаження списку…</p>
          ` : ''}

          ${!isLoading && !error && tickets.length === 0 ? `
            <p class="text-sm text-slate-400 text-center py-8">Незакритих заявок не знайдено.</p>
          ` : ''}

          ${tickets.map((ticket) => `
            <article class="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-1.5">
              <p class="font-mono text-xs font-semibold text-sky-300">ID: ${ticket.id}</p>
              <p class="text-sm text-slate-100 break-words">${escapeHtml(ticket.title)}</p>
              <p class="text-[11px] text-slate-400"><span class="text-slate-500">Створено:</span> ${escapeHtml(formatCreatedAt(ticket.createdAt))}</p>
              <p class="text-xs text-slate-300 break-words"><span class="text-slate-500">Адреса:</span> ${escapeHtml(ticket.addressText || 'Дані відсутні')}</p>
              <p class="text-[11px] font-mono text-emerald-300 break-all"><span class="font-sans text-slate-500">Координати:</span> ${escapeHtml(ticket.coordinates || 'Дані відсутні')}</p>
            </article>
          `).join('')}
        </div>

        <div class="p-4 border-t border-slate-800 text-[11px] leading-relaxed text-slate-400">
          Дата створення визначається за Forland LogID (UTC-позначка) або, якщо його формат інший, за датою в назві заявки. Заявки без дати показуються в кінці списку.
        </div>
      </aside>
    `;

    this.attachEvents();
  }

  private attachEvents(): void {
    const close = () => void this.store.toggleUnclosedTicketsPanel();
    const closeButton = this.container.querySelector('#btn-close-unclosed-panel');
    const backdrop = this.container.querySelector('[data-close-unclosed-panel]');
    const refreshButton = this.container.querySelector<HTMLButtonElement>('#btn-refresh-unclosed-tickets');
    const sortSelect = this.container.querySelector<HTMLSelectElement>('#select-unclosed-sort');

    closeButton?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);
    refreshButton?.addEventListener('click', () => void this.store.refreshUnclosedTickets());
    sortSelect?.addEventListener('change', () => {
      const sort = sortSelect.value;
      if (sort === 'newest' || sort === 'oldest') {
        this.store.setUnclosedTicketsSort(sort);
      }
    });
  }
}
