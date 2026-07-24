import { TicketStateStore } from '../services/TicketStateStore';
import { escapeHtml } from '../utils/security';
import { CONFIG } from '../config/constants';

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

    const formData = this.store.getFormData();
    const result = this.store.getResult();

    const wsnPayload = {
      wsnClassId: CONFIG.WSN.CLASS_ID,
      wsnStatusId: CONFIG.WSN.DEFAULT_STATUS_ID,
      statusName: CONFIG.WSN.DEFAULT_STATUS_NAME,
      operatorId: CONFIG.WSN.OPERATOR_ID,
      serviceAccount: CONFIG.WSN.SERVICE_ACCOUNT,
      callId: result.callId,
      properties: {
        [`${CONFIG.WSN.PROPERTIES.APPEAL_TYPE}_appealType`]: formData.appealType,
        [`${CONFIG.WSN.PROPERTIES.TICKET_TYPE}_ticketType`]: formData.ticketType,
        [`${CONFIG.WSN.PROPERTIES.APPLICANT_NAME}_applicantName`]: formData.applicantName,
        [`${CONFIG.WSN.PROPERTIES.APPLICANT_ADDRESS}_applicantAddress`]: formData.applicantAddress,
        [`${CONFIG.WSN.PROPERTIES.ADDRESS_TEXT}_addressText`]: formData.addressText,
        [`${CONFIG.WSN.PROPERTIES.COORDINATES}_coordinates`]: formData.coordinates,
        [`${CONFIG.WSN.PROPERTIES.PHONE_NUMBER}_phoneNumber`]: formData.phoneNumber,
        [`${CONFIG.WSN.PROPERTIES.INCIDENT_DATE_TIME}_incidentDateTime`]: formData.incidentDateTime,
        [`${CONFIG.WSN.PROPERTIES.NOTES}_notes`]: formData.notes
      },
      confirmedAt: new Date().toISOString()
    };

    const generatedTicketId = `WSN-${CONFIG.WSN.CLASS_ID}-${CONFIG.WSN.DEFAULT_STATUS_ID}-${Math.floor(1000 + Math.random() * 9000)}`;

    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
        <div class="bg-slate-900 border border-emerald-500/60 rounded-2xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 animate-in fade-in zoom-in duration-200">
          
          <!-- Header -->
          <div class="flex items-center gap-3 sm:gap-4 border-b border-slate-800 pb-3 sm:pb-4">
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 class="text-base sm:text-lg font-bold text-white">Заявку WSN успішно створено!</h3>
                <span class="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                  Статус ${CONFIG.WSN.DEFAULT_STATUS_ID}
                </span>
              </div>
              <p class="text-[10px] sm:text-xs text-slate-300">
                Заявка класу <strong class="text-sky-300">${CONFIG.WSN.CLASS_ID}</strong> зареєстрована в WSN через API під номером 
                <span class="font-mono font-bold text-emerald-400 block sm:inline">${escapeHtml(generatedTicketId)}</span>
              </p>
            </div>
          </div>

          <!-- Payload Details -->
          <div class="space-y-2">
            <h4 class="text-[10px] sm:text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Пакет даних API (WSN Service Account):</span>
              <span class="text-[9px] sm:text-[10px] text-slate-500 font-mono">JSON 200 OK</span>
            </h4>
            <pre class="bg-slate-950 p-3 sm:p-4 rounded-xl border border-slate-800 text-[10px] sm:text-[11px] font-mono text-sky-300 overflow-x-auto max-h-48 sm:max-h-60 leading-relaxed">${escapeHtml(JSON.stringify(wsnPayload, null, 2))}</pre>
          </div>

          <!-- Footer Actions -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 border-t border-slate-800 pt-3 sm:pt-4">
            <span class="text-[10px] sm:text-xs text-slate-400 text-center sm:text-left">Оператор підтвердив збіг даних.</span>
            <button id="btn-close-toast" class="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] sm:text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20">
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
