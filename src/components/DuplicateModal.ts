import { TicketStateStore } from '../services/TicketStateStore';
import { escapeHtml } from '../utils/security';
import { wsnConfig } from '../config';

export class DuplicateModalComponent {
  private store: TicketStateStore;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.store = TicketStateStore.getInstance();
  }

  public render(): void {
    const dup = this.store.getSelectedDuplicate();
    if (!dup) {
      this.container.innerHTML = '';
      return;
    }

    const currentForm = this.store.getFormData();

    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
          
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-slate-800 pb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
              </div>
              <div>
                <h3 class="text-base font-bold text-white">Знайдено дублікат заявки у WSN</h3>
                <p class="text-xs text-slate-400">Перегляд існуючої заявки класу ${wsnConfig.CLASS_ID}</p>
              </div>
            </div>

            <button id="btn-close-dup-modal" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Comparison Details -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <!-- Left: Existing Ticket -->
            <div class="bg-slate-950 p-4 rounded-xl border border-amber-500/40 space-y-3">
              <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                <span class="font-bold text-amber-400">Існуюча заявка WSN</span>
                <span class="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono text-[10px]">${escapeHtml(dup.ticketId)}</span>
              </div>
              <div class="space-y-1.5 text-slate-300">
                <p><strong class="text-slate-400">Причина збігу:</strong> <span class="text-amber-300 font-semibold">${escapeHtml(dup.matchReason)}</span></p>
                <p><strong class="text-slate-400">Статус:</strong> <span class="text-sky-300">${escapeHtml(dup.status || `${wsnConfig.DEFAULT_STATUS_ID} (${wsnConfig.DEFAULT_STATUS_NAME})`)}</span></p>
                <p><strong class="text-slate-400">Створено:</strong> ${escapeHtml(dup.createdDate || 'Сьогодні')}</p>
                <p><strong class="text-slate-400">Адреса:</strong> ${escapeHtml(dup.addressText || currentForm.addressText)}</p>
                <p><strong class="text-slate-400">Тип:</strong> ${escapeHtml(dup.appealType || currentForm.appealType)}</p>
              </div>
            </div>

            <!-- Right: Current Draft -->
            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                <span class="font-bold text-slate-300">Поточний проект оператора</span>
                <span class="bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded font-mono text-[10px]">Чернетка</span>
              </div>
              <div class="space-y-1.5 text-slate-300">
                <p><strong class="text-slate-400">Адреса:</strong> ${escapeHtml(currentForm.addressText)}</p>
                <p><strong class="text-slate-400">Координати:</strong> ${escapeHtml(currentForm.coordinates)}</p>
                <p><strong class="text-slate-400">Заявник:</strong> ${escapeHtml(currentForm.applicantName || 'Не вказано')}</p>
                <p><strong class="text-slate-400">Телефон:</strong> ${escapeHtml(currentForm.phoneNumber)}</p>
                <p><strong class="text-slate-400">Зміст:</strong> ${escapeHtml(currentForm.notes.slice(0, 60))}...</p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button id="btn-cancel-dup-modal" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all">
              Продовжити редагування чернетки
            </button>

            <button id="btn-open-in-wsn" class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md">
              Приєднати до існуючої заявки (${escapeHtml(dup.ticketId)})
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private attachEvents(): void {
    const closeBtn = this.container.querySelector('#btn-close-dup-modal');
    const cancelBtn = this.container.querySelector('#btn-cancel-dup-modal');
    const openInWsnBtn = this.container.querySelector('#btn-open-in-wsn');

    const closeModal = () => this.store.setSelectedDuplicate(null);

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (openInWsnBtn) {
      openInWsnBtn.addEventListener('click', () => {
        alert(`Перехід до картки існуючої заявки WSN: ${this.store.getSelectedDuplicate()?.ticketId}`);
        closeModal();
      });
    }
  }
}
