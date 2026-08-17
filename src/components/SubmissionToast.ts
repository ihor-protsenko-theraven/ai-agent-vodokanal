import { TicketStateStore } from '../services/TicketStateStore';
import { escapeHtml } from '../utils/security';
import { wsnConfig } from '../config';

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

    const submittedTicketId = this.store.getSubmittedTicketId();
    const ticketReference = submittedTicketId == null
      ? 'Номер заявки не повернувся у відповіді Forland.'
      : `Номер заявки Forland: ${submittedTicketId}`;

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
                <h3 class="text-lg font-bold text-white">Заявку WSN успішно створено!</h3>
                <span class="bg-emerald-500/20 text-emerald-300 font-mono text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                  Статус ${wsnConfig.DEFAULT_STATUS_ID}
                </span>
              </div>
              <p class="text-xs text-slate-300">
                Заявка класу <strong class="text-sky-300">${wsnConfig.CLASS_ID}</strong> підтверджена API.
                <span class="font-mono font-bold text-emerald-400">${escapeHtml(ticketReference)}</span>
              </p>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="flex items-center justify-between border-t border-slate-800 pt-4">
            <span class="text-xs text-slate-400">Персональні дані не виводяться у вікні підтвердження.</span>
            <button id="btn-close-toast" class="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20">
              Зрозуміло (Закрити)
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
