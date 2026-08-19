import { TicketStateStore } from '@/app/state/TicketStateStore';
import { FieldVerificationStatus, WsnTicketData } from '@/shared/types';
import { FormFieldDefinition } from '@/shared/types';
import { escapeHtml } from '@/shared/utils/security';
import { aiConfig, geoConfig, wsnConfig, uiConfig } from '@/shared/config';
import { dropdownDataService } from '@/features/forland/application/DropdownDataService';
import { geocodingService, AddressSearchResult, GeocodingProvider } from '@/features/geocoding/application/GeocodingService';
import { formatDateTimeInput } from '@/shared/utils/wsn';
import { withSelectedOption } from '@/features/tickets/domain/selectOptions';

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
    const duplicateCheckUnavailable = result.duplicateCheckStatus === 'UNAVAILABLE';
    const duplicateCheckRequired = result.duplicateCheckStatus === 'REQUIRED';
    const isCheckingDuplicates = this.store.getIsCheckingDuplicates();

    // Get dropdown options from service
    const appealTypes = dropdownDataService.getAppealTypes();
    const ticketTypes = dropdownDataService.getTicketTypes();
    const appealTypeOptions = withSelectedOption(
      appealTypes.length > 0 ? appealTypes.map(item => item.Value) : wsnConfig.OPTIONS.APPEAL_TYPES,
      formData.appealType
    );
    const ticketTypeOptions = withSelectedOption(
      ticketTypes.length > 0 ? ticketTypes.map(item => item.Value) : wsnConfig.OPTIONS.TICKET_TYPES,
      formData.ticketType
    );

    const activeGeoProvider = geocodingService.getProvider();

    const providerButtons = uiConfig.GEO_PROVIDER_BUTTONS;

    this.container.innerHTML = `
      <div class="h-auto lg:h-full flex flex-col bg-slate-900 lg:overflow-hidden">
        <!-- Panel Header & Confidence Scores Overview -->
        <div class="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col gap-3">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div class="flex items-start sm:items-center gap-2 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5 sm:mt-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-sm font-bold text-white truncate">Картка формування заявки WSN</h2>
                <p class="text-[10px] sm:text-xs text-slate-400 truncate">${uiConfig.CARD_SUBTITLE}</p>
              </div>
            </div>

            <!-- Manual Review Status Pill -->
            <div class="flex items-center gap-2 shrink-0">
              ${result.requiresManualReview ? `
                <span class="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-pulse">
                  ⚠️ Ручна перевірка
                </span>
              ` : `
                <span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                  ✓ Автоматично прийнято
                </span>
              `}
            </div>
          </div>

          <!-- Confidence Metrics Bar -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-1">
            <div class="bg-slate-900 p-2 rounded-lg border ${confidence.speechRecognition < aiConfig.CONFIDENCE_THRESHOLD ? 'border-amber-500/60 bg-amber-950/20' : 'border-slate-800'}">
              <span class="text-slate-400 block text-[9px] sm:text-[10px] truncate">Розпізнавання</span>
              <span class="font-bold ${confidence.speechRecognition < aiConfig.CONFIDENCE_THRESHOLD ? 'text-amber-400' : 'text-emerald-400'}">
                ${(confidence.speechRecognition * 100).toFixed(0)}%
              </span>
            </div>

            <div class="bg-slate-900 p-2 rounded-lg border ${confidence.classification < aiConfig.CONFIDENCE_THRESHOLD ? 'border-amber-500/60 bg-amber-950/20' : 'border-slate-800'}">
              <span class="text-slate-400 block text-[9px] sm:text-[10px] truncate">Класифікація</span>
              <span class="font-bold ${confidence.classification < aiConfig.CONFIDENCE_THRESHOLD ? 'text-amber-400' : 'text-emerald-400'}">
                ${(confidence.classification * 100).toFixed(0)}%
              </span>
            </div>

            <div class="bg-slate-900 p-2 rounded-lg border ${confidence.addressExtraction < aiConfig.CONFIDENCE_THRESHOLD ? 'border-amber-500/60 bg-amber-950/20' : 'border-slate-800'}">
              <span class="text-slate-400 block text-[9px] sm:text-[10px] truncate">Адреса</span>
              <span class="font-bold ${confidence.addressExtraction < aiConfig.CONFIDENCE_THRESHOLD ? 'text-amber-400' : 'text-emerald-400'}">
                ${(confidence.addressExtraction * 100).toFixed(0)}%
              </span>
            </div>

            <div class="bg-slate-900 p-2 rounded-lg border ${confidence.geocoding < aiConfig.CONFIDENCE_THRESHOLD ? 'border-amber-500/60 bg-amber-950/20' : 'border-slate-800'}">
              <span class="text-slate-400 block text-[9px] sm:text-[10px] truncate">Геокодування</span>
              <span class="font-bold ${confidence.geocoding < aiConfig.CONFIDENCE_THRESHOLD ? 'text-amber-400' : 'text-emerald-400'}">
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
                    Виявлено <strong>${duplicates.length}</strong> збігів адреси або координат з активними заявками класу ${wsnConfig.CLASS_ID}:
                    <span class="font-mono underline font-semibold ml-1">${duplicates.map(d => escapeHtml(d.ticketId)).join(', ')}</span>
                    Перегляньте кандидата: оператор може відхилити хибний збіг і продовжити створення чернетки.
                  </p>
                </div>
              </div>

              <button id="btn-open-duplicate" class="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 flex-shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                Переглянути кандидата
              </button>
            </div>
          ` : ''}

          ${duplicateCheckUnavailable ? `
            <div class="bg-rose-950/40 border border-rose-500/60 rounded-xl p-3 text-xs text-rose-200">
              Перевірка можливих дублікатів у Forland недоступна. Створення заявки заблоковано, щоб не створити дубль.
            </div>
          ` : ''}

          ${duplicateCheckRequired ? `
            <div class="bg-amber-950/40 border border-amber-500/60 rounded-xl p-3 text-xs text-amber-100 flex flex-wrap items-center justify-between gap-3">
              <span>Адресу змінено. Перед збереженням перевірте можливі дублікати у Forland.</span>
              <button id="btn-check-duplicates" ${isCheckingDuplicates ? 'disabled' : ''} class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-950 disabled:text-slate-300 font-semibold rounded-lg text-xs transition-all">
                ${isCheckingDuplicates ? 'Перевірка…' : 'Перевірити дублікати'}
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
                label: `Тип звернення`,
                fieldKey: 'appealType',
                value: formData.appealType,
                type: 'select',
                options: appealTypeOptions,
                confidenceKey: 'classification',
                confidenceScore: confidence.classification,
                isRequired: false
              })}

              <!-- WSN Property 1972: Ticket Type -->
              ${this.renderFormField({
                label: `Тип заявки`,
                fieldKey: 'ticketType',
                value: formData.ticketType,
                type: 'select',
                options: ticketTypeOptions,
                confidenceKey: 'classification',
                confidenceScore: confidence.classification,
                isRequired: false
              })}
            </div>

            <!-- Row 2: Applicant Name & Phone -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- WSN Property 1961: Applicant Name -->
              ${this.renderFormField({
                label: 'ПІБ заявника',
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
                label: 'Телефон заявника',
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
                label: 'Адреса проживання заявника',
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
                label: 'Дата й час аварії',
                fieldKey: 'incidentDateTime',
                value: typeof formData.incidentDateTime === 'string' ? formData.incidentDateTime : formatDateTimeInput(formData.incidentDateTime),
                type: 'datetime-local',
                confidenceKey: 'speechRecognition',
                confidenceScore: confidence.speechRecognition,
                isRequired: false
              })}
            </div>

            <!-- Address Text (WSN -389) + Geodata Address Search -->
            ${this.renderFormField({
              label: 'Текст адреси аварії',
              fieldKey: 'addressText',
              value: formData.addressText,
              type: 'input',
              placeholder: 'Точна адреса або орієнтир обʼєкта',
              confidenceKey: 'addressExtraction',
              confidenceScore: confidence.addressExtraction,
              isRequired: false
            })}

            <!-- Address Search: Provider Feature Switcher -->
            <div class="p-3 rounded-xl border border-slate-800 bg-slate-950/40 space-y-2">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[10px] text-slate-400 font-semibold">Джерело пошуку адрес:</span>
                <div class="flex rounded-lg border border-slate-700 overflow-hidden text-[10px] font-semibold">
                  ${geoConfig.GEOCODING_PROVIDERS.map((provider) => `
                    <button type="button" data-geo-provider="${provider}" title="${providerButtons[provider].title}"
                      class="geo-provider-btn px-2.5 py-1.5 transition-all ${
                        provider === activeGeoProvider
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }">${providerButtons[provider].label}</button>
                  `).join('')}
                </div>
              </div>

              <div class="flex gap-2">
                <input id="geo-search-input" type="text" value="${escapeHtml(formData.addressText || '')}" placeholder="Пошук адреси: місто, вулиця, будинок..." class="form-input flex-1 bg-slate-900 text-xs rounded-lg border border-slate-700 text-slate-100 p-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-none"/>
                <button id="btn-geo-search" class="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  Пошук
                </button>
              </div>
              <div id="geo-search-status" class="hidden text-[10px] text-slate-400"></div>
              <div id="geo-address-confirmation" class="hidden"></div>
              <div id="geo-search-results" class="hidden max-h-44 overflow-y-auto space-y-1"></div>
            </div>

            <!-- Coordinates (WSN -420) - MANDATORY + Reverse Geocoding -->
            ${this.renderFormField({
              label: 'Координати *ОБОВ\'ЯЗКОВЕ*',
              fieldKey: 'coordinates',
              value: formData.coordinates,
              type: 'input',
                placeholder: 'Широта, довгота (визначаються за адресою)',
              confidenceKey: 'geocoding',
              confidenceScore: confidence.geocoding,
              isRequired: true
            })}

            <div class="flex items-center justify-between gap-2">
              <button id="btn-reverse-geocode" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                Адреса за координатами
              </button>
              <span id="reverse-geo-status" class="hidden text-[10px] text-slate-400"></span>
            </div>

            <!-- Notes (WSN 328) - MANDATORY -->
            ${this.renderFormField({
              label: 'Примітки / Зміст звернення *ОБОВ\'ЯЗКОВЕ*',
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
            Створити заявку (WSN Клас ${wsnConfig.CLASS_ID} / Статус ${wsnConfig.DEFAULT_STATUS_ID})
          </button>
        </div>
      </div>
    `;

    this.attachEvents();
    this.renderPendingAddressConfirmation();
    this.scheduleAutoGeocode();
  }

  private renderFormField(opts: FormFieldDefinition): string {
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
            <option value="" class="bg-slate-900" ${!opts.value ? 'selected' : ''} disabled>Оберіть значення</option>
            ${(opts.options || []).map(opt => `
              <option value="${escapeHtml(opt)}" class="bg-slate-900 text-slate-100" ${opt === opts.value ? 'selected' : ''}>${escapeHtml(opt)}</option>
            `).join('')}
          </select>
        ` : opts.type === 'textarea' ? `
          <textarea id="field-${opts.fieldKey}" data-field="${opts.fieldKey}" rows="3" placeholder="${escapeHtml(opts.placeholder || '')}" class="form-input w-full bg-slate-900 text-xs rounded-lg border border-slate-700 text-slate-100 p-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-none ${isLowConfidence && !isVerified ? 'low-confidence-field' : ''}">${escapeHtml(opts.value)}</textarea>
        ` : `
          <input type="${opts.type}" id="field-${opts.fieldKey}" data-field="${opts.fieldKey}" value="${escapeHtml(opts.value)}" placeholder="${escapeHtml(opts.placeholder || '')}" class="form-input w-full bg-slate-900 text-xs rounded-lg border border-slate-700 text-slate-100 p-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-none ${isLowConfidence && !isVerified ? 'low-confidence-field' : ''}"/>
        `}

        <!-- Mandatory Verification Checkbox for Low Confidence Fields (Requirement 3) -->
        ${isLowConfidence ? `
          <div class="pt-1 flex items-center justify-between border-t border-amber-500/20 mt-1">
            <label class="flex items-center gap-1.5 cursor-pointer select-none text-amber-300 font-medium text-[10px] leading-tight">
              <input type="checkbox" data-verify="${opts.fieldKey}" ${isVerified ? 'checked' : ''} class="checkbox-verify w-3.5 h-3.5 rounded text-amber-500 bg-slate-900 border-amber-500 focus:ring-amber-500 cursor-pointer"/>
              <span>Підтвердити правильність даних</span>
            </label>
            ${isVerified ? `
              <span class="text-[9px] text-emerald-400 font-semibold flex items-center gap-1">
                ✓ Підтверджено
              </span>
            ` : `
              <span class="text-[9px] text-amber-400 font-semibold">
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
          // Keep the store current without rebuilding the entire form on every
          // keystroke. A full render would replace this input and lose focus.
          this.store.updateFormField(fieldKey, target.value, false);
          if (fieldKey === 'addressText') {
            this.scheduleAutoGeocode();
          }
        }
      });

      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const fieldKey = target.dataset.field as keyof WsnTicketData;
        if (fieldKey) {
          // Commit validation and dependent UI after the operator completes an edit.
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

    const checkDuplicatesButton = this.container.querySelector<HTMLButtonElement>('#btn-check-duplicates');
    if (checkDuplicatesButton) {
      checkDuplicatesButton.addEventListener('click', async () => {
        await this.store.checkDuplicates();
      });
    }

    // Submit ticket button
    const btnSubmit = this.container.querySelector<HTMLButtonElement>('#btn-submit-ticket');
    if (btnSubmit) {
      btnSubmit.addEventListener('click', async () => {
        if (this.store.isValid()) {
          // Show loading state
          btnSubmit.disabled = true;
          btnSubmit.innerHTML = `
            <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Збереження...
          `;

          const success = await this.store.submitTicket();
          
          if (success) {
            btnSubmit.innerHTML = `
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Заявку створено!
            `;
            btnSubmit.classList.remove('from-sky-500', 'to-sky-600', 'hover:from-sky-400', 'hover:to-sky-500');
            btnSubmit.classList.add('from-emerald-500', 'to-emerald-600', 'hover:from-emerald-400', 'hover:to-emerald-500');
          } else {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Створити заявку (WSN Клас ${wsnConfig.CLASS_ID} / Статус ${wsnConfig.DEFAULT_STATUS_ID})
            `;
            alert('Помилка при створенні заявки. Деталі дивіться в консолі браузера (F12).');
          }
        }
      });
    }

    // Geodata address search
    const btnGeoSearch = this.container.querySelector('#btn-geo-search');
    const geoSearchInput = this.container.querySelector<HTMLInputElement>('#geo-search-input');
    if (btnGeoSearch && geoSearchInput) {
      const runSearch = () => this.handleAddressSearch(
        geoSearchInput.value || this.store.getFormData().addressText || '',
        true
      );
      btnGeoSearch.addEventListener('click', runSearch);
      geoSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          runSearch();
        }
      });

      // Search-as-you-type with debounce
      geoSearchInput.addEventListener('input', () => {
        if (this.geoSearchTimer) {
          window.clearTimeout(this.geoSearchTimer);
        }
        this.geoSearchTimer = window.setTimeout(() => {
          const query = geoSearchInput.value.trim();
          if (query.length >= uiConfig.GEO_SEARCH_MIN_CHARS) {
            this.handleAddressSearch(query, false);
          } else if (query.length === 0) {
            this.clearGeoResults();
          }
        }, uiConfig.GEO_SEARCH_DEBOUNCE_MS);
      });
    }

    // Provider feature switcher
    const providerButtons = this.container.querySelectorAll<HTMLButtonElement>('.geo-provider-btn');
    providerButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const provider = btn.dataset.geoProvider as GeocodingProvider | undefined;
        if (!provider) return;

        geocodingService.setProvider(provider);

        // Update active button styles manually (avoid full re-render)
        providerButtons.forEach(b => {
          b.classList.remove('bg-sky-600', 'text-white');
          b.classList.add('bg-slate-900', 'text-slate-400', 'hover:bg-slate-800', 'hover:text-slate-200');
        });
        btn.classList.add('bg-sky-600', 'text-white');
        btn.classList.remove('bg-slate-900', 'text-slate-400', 'hover:bg-slate-800', 'hover:text-slate-200');

        this.clearGeoResults();
        // A previous lookup could have failed in another provider. Permit an
        // immediate retry of the unchanged address through the newly selected one.
        this.autoGeoAttempted = null;
        this.scheduleAutoGeocode();
        const input = this.container.querySelector<HTMLInputElement>('#geo-search-input');
        if (input && input.value.trim().length >= uiConfig.GEO_SEARCH_MIN_CHARS) {
          this.handleAddressSearch(input.value, false);
        }
      });
    });

    // Geodata address search results (delegated)
    const geoResults = this.container.querySelector('#geo-search-results');
    if (geoResults) {
      geoResults.addEventListener('click', (e) => {
        const target = (e.target as HTMLElement).closest<HTMLElement>('[data-geo-index]');
        if (!target) return;
        const index = Number(target.dataset.geoIndex);
        const item = this.lastGeoSearchResults[index];
        if (item) {
          this.applyGeoResult(item);
        }
      });
    }

    const confirmationEl = this.container.querySelector('#geo-address-confirmation');
    if (confirmationEl) {
      confirmationEl.addEventListener('click', (event) => {
        const action = (event.target as HTMLElement).closest<HTMLElement>('[data-address-confirmation]')
          ?.dataset.addressConfirmation;
        if (action) void this.handleAddressConfirmationAction(action);
      });
    }

    // Reverse geocoding by coordinates
    const btnReverse = this.container.querySelector('#btn-reverse-geocode');
    if (btnReverse) {
      btnReverse.addEventListener('click', () => this.handleReverseGeocode());
    }
  }

  private lastGeoSearchResults: AddressSearchResult[] = [];
  private pendingAddressConfirmation: AddressSearchResult | null = null;
  private geoSearchTimer: number | null = null;
  private autoGeoTimer: number | null = null;
  private autoGeoAttempted: string | null = null;

  private clearGeoResults(): void {
    if (this.geoSearchTimer) {
      window.clearTimeout(this.geoSearchTimer);
      this.geoSearchTimer = null;
    }
    const statusEl = this.container.querySelector('#geo-search-status');
    const resultsEl = this.container.querySelector('#geo-search-results');
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.classList.add('hidden');
    }
    if (resultsEl) {
      resultsEl.classList.add('hidden');
      resultsEl.innerHTML = '';
    }
    this.clearAddressConfirmation();
  }

  private clearAddressConfirmation(): void {
    this.pendingAddressConfirmation = null;
    const confirmationEl = this.container.querySelector('#geo-address-confirmation');
    if (confirmationEl) {
      confirmationEl.classList.add('hidden');
      confirmationEl.innerHTML = '';
    }
  }

  private renderPendingAddressConfirmation(): void {
    if (this.pendingAddressConfirmation?.confirmation) {
      this.showAddressConfirmation(this.pendingAddressConfirmation);
    }
  }

  private async handleAddressConfirmationAction(action: string): Promise<void> {
    const pending = this.pendingAddressConfirmation;
    if (!pending?.confirmation) return;

    if (action === 'accept') {
      this.applyGeoResult(pending, true);
      this.clearAddressConfirmation();
      return;
    }

    if (action === 'edit') {
      this.clearAddressConfirmation();
      const input = this.container.querySelector<HTMLInputElement>('#geo-search-input');
      input?.focus();
      input?.select();
      return;
    }

    if (action === 'suggestions') {
      const query = pending.confirmation.originalAddress;
      this.clearAddressConfirmation();
      await this.handleAddressSearch(query, false);
    }
  }

  private showAddressConfirmation(result: AddressSearchResult): void {
    const confirmation = result.confirmation;
    const confirmationEl = this.container.querySelector('#geo-address-confirmation');
    if (!confirmation || !confirmationEl) return;

    this.pendingAddressConfirmation = result;
    const hasCoordinates = Boolean(result.coords);
    confirmationEl.innerHTML = `
      <div class="rounded-lg border border-amber-500/60 bg-amber-950/30 p-3 text-[11px] text-amber-100 space-y-2">
        <div class="font-semibold text-amber-200">⚠️ Geodata змінила або не підтвердила адресу</div>
        <p><span class="text-amber-300/70">Почута адреса:</span> ${escapeHtml(confirmation.originalAddress)}</p>
        <p><span class="text-amber-300/70">Geodata пропонує:</span> ${escapeHtml(confirmation.resolvedAddress)}</p>
        ${confirmation.reasons.length > 0 ? `
          <ul class="list-disc list-inside text-amber-200/80 space-y-0.5">
            ${confirmation.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}
          </ul>
        ` : ''}
        <p class="text-amber-200/80">Координати ${hasCoordinates ? 'знайдено, але вони не будуть застосовані без рішення оператора.' : 'не знайдено.'}</p>
        <div class="flex flex-wrap gap-2 pt-1">
          <button type="button" data-address-confirmation="accept" class="px-2.5 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold transition-colors">Прийняти адресу Geodata</button>
          <button type="button" data-address-confirmation="edit" class="px-2.5 py-1.5 rounded-md border border-amber-400/50 hover:bg-amber-900/40 text-amber-100 font-semibold transition-colors">Редагувати</button>
          <button type="button" data-address-confirmation="suggestions" class="px-2.5 py-1.5 rounded-md border border-amber-400/50 hover:bg-amber-900/40 text-amber-100 font-semibold transition-colors">Шукати варіанти</button>
        </div>
      </div>
    `;
    confirmationEl.classList.remove('hidden');
  }

  /**
   * Auto-geocode the address when it changes and coordinates are still empty.
   */
  private scheduleAutoGeocode(): void {
    const address = (this.store.getFormData().addressText || '').trim();
    if (!address || address === this.autoGeoAttempted) return;
    if (this.store.getFormData().coordinates && this.store.getFormData().coordinates.trim()) return;

    if (this.autoGeoTimer) {
      window.clearTimeout(this.autoGeoTimer);
    }
    this.autoGeoTimer = window.setTimeout(() => this.runAutoGeocode(address), uiConfig.AUTO_GEOCODE_DEBOUNCE_MS);
  }

  private async runAutoGeocode(address: string): Promise<void> {
    this.autoGeoAttempted = address;
    const currentCoords = (this.store.getFormData().coordinates || '').trim();
    if (currentCoords) return;

    const results = await geocodingService.searchWithResults(address, { resolveExact: true });
    const result = results[0];
    if (!result || (this.store.getFormData().coordinates || '').trim()) return;

    if (result.confirmation) {
      this.showAddressConfirmation(result);
      return;
    }

    if (result.coords) {
      // Preserve the spoken/raw address in the form. A confirmed point is
      // attached to it, but the canonical Geodata text is only written after
      // an explicit operator choice.
      this.store.applyGeocodedAddress(undefined, result.coords);
    }
  }

  private async handleAddressSearch(rawQuery: string, resolveExact: boolean = false): Promise<void> {
    const statusEl = this.container.querySelector('#geo-search-status');
    const resultsEl = this.container.querySelector('#geo-search-results');
    const query = rawQuery.trim();

    if (statusEl) {
      statusEl.textContent = '';
      statusEl.classList.add('hidden');
    }
    if (resultsEl) {
      resultsEl.classList.add('hidden');
      resultsEl.innerHTML = '';
    }
    this.clearAddressConfirmation();

    if (!query) {
      if (statusEl) {
        statusEl.textContent = 'Введіть адресу для пошуку.';
        statusEl.classList.remove('hidden');
      }
      return;
    }

    const results = await geocodingService.searchWithResults(query, { resolveExact });
    this.lastGeoSearchResults = results;

    if (!resultsEl || !statusEl) return;

    if (results.length === 0) {
      statusEl.textContent = resolveExact
        ? 'FullAddress не розпізнав адресу. Перевірте місто, назву вулиці та номер будинку або скористайтеся ручним пошуком.'
        : 'Варіантів адреси не знайдено. Спробуйте уточнити запит (місто, вулиця, будинок).';
      statusEl.classList.remove('hidden');
      return;
    }

    if (resolveExact && results.length === 1 && results[0].confirmation) {
      this.showAddressConfirmation(results[0]);
      return;
    }

    // A full-address search that returned one exact point needs no extra click.
    // This also makes the separate "Пошук адреси" input behave like users expect.
    if (resolveExact && results.length === 1 && results[0].coords) {
      this.applyGeoResult(results[0]);
      return;
    }

    resultsEl.innerHTML = results.map((result, index) => {
      const item = result.item;
      const coords = result.coords;
      return `
        <button type="button" data-geo-index="${index}" class="w-full text-left p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 transition-all cursor-pointer">
          <div class="text-xs font-semibold text-slate-100">${escapeHtml(item.AddressString || '')}</div>
          <div class="text-[10px] text-slate-400 mt-0.5">
            ${result.source === 'geodata-autocomplete' ? 'Варіант Address · після вибору буде перевірений через FullAddress · ' : ''}${item.Index_ ? `Індекс: ${escapeHtml(item.Index_)} · ` : ''}${item.CityDistrict ? `Район: ${escapeHtml(item.CityDistrict)} · ` : ''}${coords ? `Координати: <span class="font-mono text-emerald-400">${escapeHtml(coords)}</span>` : 'Координати відсутні'}
          </div>
        </button>
      `;
    }).join('');

    resultsEl.classList.remove('hidden');
  }

  private applyGeoResult(result: AddressSearchResult, operatorConfirmed: boolean = false): void {
    if (result.confirmation && !operatorConfirmed) {
      this.showAddressConfirmation(result);
      return;
    }

    // Address is only an autocomplete endpoint. A manually chosen candidate
    // still goes through FullAddress before its point can enter a ticket.
    if (result.source === 'geodata-autocomplete' && result.item.AddressString) {
      void this.handleAddressSearch(result.item.AddressString, true);
      return;
    }

    if (result.coords) {
      this.store.applyGeocodedAddress(result.item.AddressString, result.coords);
    } else if (result.item.AddressString) {
      this.store.updateFormField('addressText', result.item.AddressString);
    }
  }

  private async handleReverseGeocode(): Promise<void> {
    const statusEl = this.container.querySelector('#reverse-geo-status');
    const current = this.store.getFormData().coordinates || '';

    if (statusEl) {
      statusEl.textContent = '';
      statusEl.classList.add('hidden');
    }

    const parts = current.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length < 2) {
      if (statusEl) {
        statusEl.textContent = 'Спочатку введіть координати у форматі "широта, довгота".';
        statusEl.classList.remove('hidden');
      }
      return;
    }

    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      if (statusEl) {
        statusEl.textContent = 'Невірний формат координат. Очікується "широта, довгота".';
        statusEl.classList.remove('hidden');
      }
      return;
    }

    if (statusEl) {
      statusEl.textContent = 'Пошук адреси...';
      statusEl.classList.remove('hidden');
    }

    const address = await geocodingService.getAddressByCoordinates(lat, lng);

    if (statusEl) {
      if (address) {
        statusEl.textContent = '';
        statusEl.classList.add('hidden');
      } else {
        statusEl.textContent = 'Адресу за координатами не знайдено.';
        statusEl.classList.remove('hidden');
      }
    }

    if (address) {
      this.store.updateFormField('addressText', address);
    }
  }
}
