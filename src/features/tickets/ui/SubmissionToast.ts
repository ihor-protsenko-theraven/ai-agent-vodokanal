import { TicketStateStore } from '@/app/state/TicketStateStore';
import { getTicketNumber } from '@/features/forland/domain/saveResult';
import { escapeHtml } from '@/shared/utils/security';

export class SubmissionToastComponent {
  private store: TicketStateStore;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.store = TicketStateStore.getInstance();
  }

  public render(): void {
    const isSubmitted = this.store.getIsSubmitted();
    if (!isSubmitted) {
      this.container.innerHTML = '';
      return;
    }

    const ticket = this.store.getSubmittedTicket();
    const ticketNumber = getTicketNumber(ticket?.Title);
    const primaryReference = ticketNumber ? `Заявка № ${ticketNumber}` : 'Заявку збережено';
    const fallbackMessage = ticket == null
      ? 'Forland підтвердив збереження, але не надав ідентифікатор заявки.'
      : '';

    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-emerald-500/60 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
          
          <!-- Header -->
          <div class="flex items-center gap-4 border-b border-slate-800 pb-4">
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-bold text-white">Заявку успішно створено</h3>
                <span class="bg-emerald-500/20 text-emerald-300 font-mono text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                  Збережено в WSN
                </span>
              </div>
              <p class="text-xs text-slate-300">Forland підтвердив створення заявки.</p>
            </div>
          </div>

          <div class="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Номер заявки</p>
              <p class="mt-1 text-xl font-bold text-emerald-300">${escapeHtml(primaryReference)}</p>
            </div>
            ${ticket?.ID != null ? `
              <div class="sm:border-l sm:border-slate-700 sm:pl-4">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">WSN ID</p>
                <p class="mt-1 font-mono text-base font-semibold text-slate-100">${ticket.ID}</p>
              </div>
            ` : ''}
            ${ticket?.MetaID != null ? `
              <p class="sm:col-span-2 text-xs text-slate-400">Клас заявки: <span class="font-mono text-sky-300">${ticket.MetaID}</span></p>
            ` : ''}
            ${fallbackMessage ? `<p class="sm:col-span-2 text-xs text-amber-300">${escapeHtml(fallbackMessage)}</p>` : ''}
          </div>

          <!-- Footer Actions -->
          <div class="flex items-center justify-between border-t border-slate-800 pt-4">
            <span class="text-xs text-slate-400">Персональні дані не виводяться у вікні підтвердження.</span>
            <button id="btn-close-toast" class="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20">
              Готово
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private attachEvents(): void {
    const btn = this.container.querySelector('#btn-close-toast');
    if (btn) {
      btn.addEventListener('click', () => {
        this.store.resetSubmission();
      });
    }
  }
}
