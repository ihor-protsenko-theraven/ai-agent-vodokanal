import { TicketStateStore } from '../services/TicketStateStore';
import { FieldVerificationStatus, WsnTicketData } from '../types/ticket';
import { escapeHtml } from '../utils/security';
import { CONFIG } from '../config/constants';

export class TicketFormPanelComponent {
  private store: TicketStateStore;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.store = TicketStateStore.getInstance();
  }

  public render(): void {
    const result = this.store.getResult();
    const formData = this.store.getFormData();
    const confidence = result.confidence;
    const isValid = this.store.isValid();
    const validationErrors = this.store.getValidationErrors();
    const isForceUnlocked = this.store.isForceUnlocked();

    const registrationBlocked = !result.requiresTicketRegistration && !isForceUnlocked;
    const duplicates = result.duplicatesFound || [];

    this.container.innerHTML = `
      <div class="h-auto lg:h-full flex flex-col bg-slate-900 lg:overflow-hidden">
        <!-- Panel Header & Confidence Scores Overview -->
        <div class="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <div>
                <h2 class="text-sm font-bold text-white">Картка формування заявки WSN</h2>
                <p class="text-xs text-slate-400">Класифікація WSN 27994 / Обліковий запис WSN-SERVICE</p>
              </div>
            </div>

            <!-- Manual Review Status Pill -->
            <div class="flex items-center gap-2">
              ${result.requiresManualReview ? `
                <span class="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-pulse">
                  ⚠️ Ручна перевірка
                </span>
              ` : `
                <span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                  ✓ Автоматично прийнято
                </span>
              `}
            </div>
          </div>

          <!-- Confidence Metrics Bar -->
          <div class="grid grid-cols-4 gap-2 text-xs">
            <div class="bg-slate-900 p-2 rounded-lg border ${confidence.speechRecognition < 0.7 ? 'border-amber-500/60 bg-amber-950/20' : 'border-slate-800'}">
              <span class="text-slate-400 block text-[10px]">Розпізнавання</span>
              <span class="font-bold ${confidence.speechRecognition < 0.7 ? 'text-amber-400' : 'text-emerald-400'}">
                ${(confidence.speechRecognition * 100).toFixed(0)}%
              </span>
            </div>

            <div class="bg-slate-900 p-2 rounded-lg border ${confidence.classification < 0.7 ? 'border-amber-500/60 bg-amber-950/20' : 'border-slate-800'}">
              <span class="text-slate-400 block text-[10px]">Класифікація</span>
              <span class="font-bold ${confidence.classification < 0.7 ? 'text-amber-400' : 'text-emerald-400'}">
                ${(confidence.classification * 100).toFixed(0)}%
              </span>
            </div>

            <div class="bg-slate-900 p-2 rounded-lg border ${confidence.addressExtraction < 0.7 ? 'border-amber-500/60 bg-amber-950/20' : 'border-slate-800'}">
              <span class="text-slate-400 block text-[10px]">Адреса</span>
              <span class="font-bold ${confidence.addressExtraction < 0.7 ? 'text-amber-400' : 'text-emerald-400'}">
                ${(confidence.addressExtraction * 100).toFixed(0)}%
              </span>
            </div>

            <div class="bg-slate-900 p-2 rounded-lg border ${confidence.geocoding < 0.7 ? 'border-amber-500/60 bg-amber-950/20' : 'border-slate-800'}">
              <span class="text-slate-400 block text-[10px]">Геокодування</span>
              <span class="font-bold ${confidence.geocoding < 0.7 ? 'text-amber-400' : 'text-emerald-400'}">
                ${(confidence.geocoding * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        <!-- Scrollable Form Container -->
        <div class="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-900/60">

          <!-- DUPLICATES ALERT BANNER (Requirement 5) -->
          ${duplicates.length > 0 ? `
            <div class="bg-gradient-to-r from-amber-950/80 to-amber-900/40 border-2 border-amber-500/80 rounded-2xl p-4 shadow-lg shadow-amber-950/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-amber-300">Увага! Знайдено можливі дублікати WSN</h3>
                  <p class="text-xs text-amber-200/80 mt-0.5">
                    Виявлено <strong>${duplicates.length}</strong> існуючих заявок класу 27772 за цією адресою/координатами:
                    <span class="font-mono underline font-semibold ml-1">${duplicates.map(d => escapeHtml(d.ticketId)).join(', ')}</span>
                  </p>
                </div>
              </div>

              <button id="btn-open-duplicate" class="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 flex-shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                Відкрити існуючу
              </button>
            </div>
          ` : ''}

          <!-- NOT REQUIRED REGISTRATION BANNER (Requirement 6) -->
          ${!result.requiresTicketRegistration ? `
            <div class="bg-slate-950/90 border border-slate-700 rounded-2xl p-4 shadow-md flex items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                  ℹ️
                </div>
                <div>
                  <h3 class="text-xs font-bold text-slate-200">Звернення не потребує створення заявки</h3>
                  <p class="text-[11px] text-slate-400">AI-агент класифікував звернення як інформаційне або таке, що не потребує виїзду бригади.</p>
                </div>
              </div>

              <button id="btn-force-unlock" class="px-3.5 py-2 ${isForceUnlocked ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'} border border-slate-700 text-xs font-semibold rounded-xl transition-all flex-shrink-0">
                ${isForceUnlocked ? '✓ Розблоковано' : 'Створити примусово'}
              </button>
            </div>
          ` : ''}

          <!-- FORM FIELDS WITH DYNAMIC HIGHLIGHTS & VERIFICATION CHECKBOXES -->
          <div class="space-y-4 ${registrationBlocked ? 'opacity-50 pointer-events-none' : ''}">
            
            <!-- Row 1: Appeal Type & Ticket Type -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- WSN Property 1958: Appeal Type -->
              ${this.renderFormField({
                label: `Тип звернення (WSN ${CONFIG.WSN.PROPERTIES.APPEAL_TYPE})`,
                fieldKey: 'appealType',
                value: formData.appealType,
                type: 'select',
                options: [...CONFIG.OPTIONS.APPEAL_TYPES],
                confidenceKey: 'classification',
                confidenceScore: confidence.classification,
                isRequired: false
              })}

              <!-- WSN Property 1972: Ticket Type -->
              ${this.renderFormField({
                label: `Тип заявки (WSN ${CONFIG.WSN.PROPERTIES.TICKET_TYPE})`,
                fieldKey: 'ticketType',
                value: formData.ticketType,
                type: 'select',
                options: [...CONFIG.OPTIONS.TICKET_TYPES],
                confidenceKey: 'classification',
                confidenceScore: confidence.classification,
                isRequired: false
              })}
            </div>

            <!-- Row 2: Applicant Name & Phone -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- WSN Property 1961: Applicant Name -->
              ${this.renderFormField({
                label: 'ПІБ заявника (WSN 1961)',
                fieldKey: 'applicantName',
                value: formData.applicantName || '',
                type: 'input',
                placeholder: 'ПІБ громадянина',
                confidenceKey: 'speechRecognition',
                confidenceScore: confidence.speechRecognition,
                isRequired: false
              })}

              <!-- WSN Property 1981: Phone Number -->
              ${this.renderFormField({
                label: 'Телефон заявника (WSN 1981)',
                fieldKey: 'phoneNumber',
                value: formData.phoneNumber,
                type: 'input',
                placeholder: '+380...',
                confidenceKey: 'speechRecognition',
                confidenceScore: confidence.speechRecognition,
                isRequired: false
              })}
            </div>

            <!-- Row 3: Applicant Address & Incident Date -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- WSN Property 1960: Applicant Address -->
              ${this.renderFormField({
                label: 'Адреса проживання заявника (WSN 1960)',
                fieldKey: 'applicantAddress',
                value: formData.applicantAddress || '',
                type: 'input',
                placeholder: 'вулиця, будинок, квартира',
                confidenceKey: 'addressExtraction',
                confidenceScore: confidence.addressExtraction,
                isRequired: false
              })}

              <!-- WSN Property 1258: Incident Date/Time -->
              ${this.renderFormField({
                label: 'Дата й час аварії (WSN 1258)',
                fieldKey: 'incidentDateTime',
                value: typeof formData.incidentDateTime === 'string' ? formData.incidentDateTime : formData.incidentDateTime.toISOString().slice(0, 16),
                type: 'datetime-local',
                confidenceKey: 'speechRecognition',
                confidenceScore: confidence.speechRecognition,
                isRequired: false
              })}
            </div>

            <!-- Address Text (WSN -389) -->
            ${this.renderFormField({
              label: 'Текст адреси аварії (WSN -389)',
              fieldKey: 'addressText',
              value: formData.addressText,
              type: 'input',
              placeholder: 'Точна адреса або орієнтир обʼєкта',
              confidenceKey: 'addressExtraction',
              confidenceScore: confidence.addressExtraction,
              isRequired: false
            })}

            <!-- Coordinates (WSN -420) - MANDATORY -->
            ${this.renderFormField({
              label: 'Координати (WSN -420) *ОБОВ\'ЯЗКОВЕ*',
              fieldKey: 'coordinates',
              value: formData.coordinates,
              type: 'input',
              placeholder: '50.4501, 30.5234 (широта, довгота)',
              confidenceKey: 'geocoding',
              confidenceScore: confidence.geocoding,
              isRequired: true
            })}

            <!-- Notes (WSN 328) - MANDATORY -->
            ${this.renderFormField({
              label: 'Примітки / Зміст звернення (WSN 328) *ОБОВ\'ЯЗКОВЕ*',
              fieldKey: 'notes',
              value: formData.notes,
              type: 'textarea',
              placeholder: 'Короткий зміст події та додаткова інформація...',
              confidenceKey: 'speechRecognition',
              confidenceScore: confidence.speechRecognition,
              isRequired: true
            })}

          </div>
        </div>

        <!-- Submit & Validation Footer -->
        <div class="p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-3">
          
          <!-- Validation Warnings Box (if invalid) -->
          ${!isValid ? `
            <div class="bg-amber-950/30 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-200">
              <div class="font-bold flex items-center gap-1 mb-1">
                <span>⚠️ Необхідні дії для створення заявки:</span>
              </div>
              <ul class="list-disc list-inside space-y-0.5 text-[11px] text-amber-300/90">
                ${validationErrors.map(err => `<li>${escapeHtml(err)}</li>`).join('')}
              </ul>
            </div>
          ` : `
            <div class="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-2.5 text-xs text-emerald-300 flex items-center gap-2">
              <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <span>Усі поля заповнені та перевірені. Готово до підтвердження!</span>
            </div>
          `}

          <!-- Submit Button -->
          <button id="btn-submit-ticket" ${!isValid ? 'disabled' : ''} class="w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
            isValid 
              ? 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white shadow-sky-600/30 ring-2 ring-sky-400/40 cursor-pointer active:scale-[0.99]' 
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
          }">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Створити заявку (WSN Клас 27772 / Статус 5996)
          </button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderFormField(opts: {
    label: string;
    fieldKey: keyof WsnTicketData;
    value: string;
    type: 'input' | 'textarea' | 'select' | 'datetime-local';
    options?: string[];
    placeholder?: string;
    confidenceKey: string;
    confidenceScore: number;
    isRequired: boolean;
  }): string {
    const isLowConfidence = this.store.isFieldLowConfidence(opts.fieldKey as keyof FieldVerificationStatus);
    const isVerified = this.store.getVerifications()[opts.fieldKey as keyof FieldVerificationStatus];

    return `
      <div class="space-y-1.5 p-3 rounded-xl transition-all border ${
        isLowConfidence 
          ? (isVerified ? 'bg-slate-950/60 border-amber-500/50' : 'bg-amber-950/20 border-amber-500/80 shadow-md shadow-amber-950/30') 
          : 'bg-slate-950/40 border-slate-800/80'
      }">
        <div class="flex items-start justify-between gap-2 mb-1">
          <label for="field-${opts.fieldKey}" class="text-[10px] sm:text-xs font-semibold text-slate-200 flex-1 leading-snug">
            ${opts.label}
          </label>

          <!-- Confidence Badge & Warning Pill -->
          ${isLowConfidence ? `
            <span class="low-confidence-badge whitespace-nowrap flex-shrink-0">
              ⚠️ Перевірити (${(opts.confidenceScore * 100).toFixed(0)}%)
            </span>
          ` : `
            <span class="text-[10px] text-emerald-400 font-mono flex-shrink-0 whitespace-nowrap">
              ✓ ${(opts.confidenceScore * 100).toFixed(0)}%
            </span>
          `}
        </div>

        <!-- Input Control -->
        ${opts.type === 'select' ? `
          <select id="field-${opts.fieldKey}" data-field="${opts.fieldKey}" class="form-input w-full bg-slate-900 text-xs rounded-lg border border-slate-700 text-slate-100 p-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-none ${isLowConfidence && !isVerified ? 'low-confidence-field' : ''}">
            ${(opts.options || []).map(opt => `
              <option value="${escapeHtml(opt)}" ${opt === opts.value ? 'selected' : ''}>${escapeHtml(opt)}</option>
            `).join('')}
          </select>
        ` : opts.type === 'textarea' ? `
          <textarea id="field-${opts.fieldKey}" data-field="${opts.fieldKey}" rows="3" placeholder="${escapeHtml(opts.placeholder || '')}" class="form-input w-full bg-slate-900 text-xs rounded-lg border border-slate-700 text-slate-100 p-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-none ${isLowConfidence && !isVerified ? 'low-confidence-field' : ''}">${escapeHtml(opts.value)}</textarea>
        ` : `
          <input type="${opts.type}" id="field-${opts.fieldKey}" data-field="${opts.fieldKey}" value="${escapeHtml(opts.value)}" placeholder="${escapeHtml(opts.placeholder || '')}" class="form-input w-full bg-slate-900 text-xs rounded-lg border border-slate-700 text-slate-100 p-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-none ${isLowConfidence && !isVerified ? 'low-confidence-field' : ''}"/>
        `}

        <!-- Mandatory Verification Checkbox for Low Confidence Fields (Requirement 3) -->
        ${isLowConfidence ? `
          <div class="pt-1 flex items-center justify-between text-xs border-t border-amber-500/20 mt-1">
            <label class="flex items-center gap-2 cursor-pointer select-none text-amber-300 font-medium">
              <input type="checkbox" data-verify="${opts.fieldKey}" ${isVerified ? 'checked' : ''} class="checkbox-verify w-4 h-4 rounded text-amber-500 bg-slate-900 border-amber-500 focus:ring-amber-500 cursor-pointer"/>
              <span>Підтвердити правильність даних</span>
            </label>
            ${isVerified ? `
              <span class="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                ✓ Підтверджено
              </span>
            ` : `
              <span class="text-[10px] text-amber-400 font-semibold">
                Потрібен чекбокс
              </span>
            `}
          </div>
        ` : ''}
      </div>
    `;
  }

  private attachEvents(): void {
    // Form inputs change/input handlers
    const inputs = this.container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('.form-input');
    inputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const fieldKey = target.dataset.field as keyof WsnTicketData;
        if (fieldKey) {
          this.store.updateFormField(fieldKey, target.value);
        }
      });
    });

    // Verification checkboxes toggle
    const checkboxes = this.container.querySelectorAll<HTMLInputElement>('.checkbox-verify');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const fieldKey = cb.dataset.verify as keyof FieldVerificationStatus;
        if (fieldKey) {
          this.store.toggleVerification(fieldKey);
        }
      });
    });

    // Force unlock button
    const btnUnlock = this.container.querySelector('#btn-force-unlock');
    if (btnUnlock) {
      btnUnlock.addEventListener('click', () => {
        const current = this.store.isForceUnlocked();
        this.store.setForceUnlocked(!current);
      });
    }

    // Open duplicate modal button
    const btnDup = this.container.querySelector('#btn-open-duplicate');
    if (btnDup) {
      btnDup.addEventListener('click', () => {
        const dups = this.store.getResult().duplicatesFound;
        if (dups.length > 0) {
          this.store.setSelectedDuplicate(dups[0]);
        }
      });
    }

    // Submit ticket button
    const btnSubmit = this.container.querySelector('#btn-submit-ticket');
    if (btnSubmit) {
      btnSubmit.addEventListener('click', () => {
        if (this.store.isValid()) {
          this.store.submitTicket();
        }
      });
    }
  }
}
