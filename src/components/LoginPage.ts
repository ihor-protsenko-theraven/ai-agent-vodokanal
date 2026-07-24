import { TicketStateStore } from '../services/TicketStateStore';
import { CONFIG } from '../config/constants';
import { escapeHtml } from '../utils/security';

export class LoginPageComponent {
  private store: TicketStateStore;
  private container: HTMLElement;
  private errorMessage: string = '';

  constructor(container: HTMLElement) {
    this.container = container;
    this.store = TicketStateStore.getInstance();
  }

  public render(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-3 sm:p-4 relative overflow-hidden font-sans">
        <!-- Background Glowing Orbs -->
        <div class="absolute -top-40 -left-40 w-64 h-64 sm:w-96 sm:h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-40 -right-40 w-64 h-64 sm:w-96 sm:h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="max-w-md w-full z-10 space-y-4 sm:space-y-6">
          <!-- Header Logo & Branding -->
          <div class="text-center space-y-2 sm:space-y-3">
            <div class="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 shadow-xl shadow-sky-500/20 text-white font-black text-xl sm:text-2xl tracking-tighter">
              WSN
            </div>
            <div>
              <h1 class="text-xl sm:text-2xl font-extrabold text-white tracking-tight">${escapeHtml(CONFIG.APP.TITLE)}</h1>
              <p class="text-[10px] sm:text-xs text-sky-400 font-semibold tracking-wide uppercase mt-1">
                ${escapeHtml(CONFIG.APP.SUBTITLE)}
              </p>
            </div>
          </div>

          <!-- Glassmorphism Login Card -->
          <div class="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl space-y-4 sm:space-y-6">
            
            <div class="border-b border-slate-800 pb-3 sm:pb-4">
              <h2 class="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>🔒 Авторизація диспетчера</span>
              </h2>
              <p class="text-[10px] sm:text-xs text-slate-400 mt-1">Введіть облікові дані для доступу до робочого місця</p>
            </div>

            <!-- Error Banner -->
            ${this.errorMessage ? `
              <div class="bg-rose-950/60 border border-rose-500/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 text-[10px] sm:text-xs text-rose-200 flex items-start gap-2 sm:gap-2.5 animate-in fade-in duration-200">
                <span class="text-sm sm:text-base">⚠️</span>
                <div>
                  <span class="font-bold">Помилка авторизації:</span>
                  <p class="mt-0.5 text-rose-300">${escapeHtml(this.errorMessage)}</p>
                </div>
              </div>
            ` : ''}

            <!-- Login Form -->
            <form id="login-form" class="space-y-3 sm:space-y-4">
              <div>
                <label for="login-username" class="block text-[10px] sm:text-xs font-semibold text-slate-300 mb-1 sm:mb-1.5">
                  Ім'я користувача (Username)
                </label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-3 sm:pl-3.5 flex items-center text-slate-400 text-xs sm:text-sm">👤</span>
                  <input
                    type="text"
                    id="login-username"
                    value="${escapeHtml(CONFIG.AUTH.DEFAULT_ADMIN_USER)}"
                    placeholder="Введіть username"
                    required
                    class="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-[10px] sm:text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label for="login-password" class="block text-[10px] sm:text-xs font-semibold text-slate-300 mb-1 sm:mb-1.5">
                  Пароль (Password)
                </label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-3 sm:pl-3.5 flex items-center text-slate-400 text-xs sm:text-sm">🔑</span>
                  <input
                    type="password"
                    id="login-password"
                    value="${escapeHtml(CONFIG.AUTH.DEFAULT_ADMIN_PASS)}"
                    placeholder="Введіть пароль"
                    required
                    class="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-[10px] sm:text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all font-mono"
                  />
                </div>
              </div>

              <!-- Quick Autofill Helper -->
              <div class="pt-0.5 sm:pt-1">
                <button
                  type="button"
                  id="btn-autofill"
                  class="w-full py-1.5 sm:py-2 px-2 sm:px-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl text-[10px] sm:text-xs text-sky-300 font-medium transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer"
                >
                  <span>🧪 Автозаповнення: <strong>${escapeHtml(CONFIG.AUTH.DEFAULT_ADMIN_USER)}</strong> / <strong>${escapeHtml(CONFIG.AUTH.DEFAULT_ADMIN_PASS)}</strong></span>
                </button>
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                class="w-full py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/25 transition-all cursor-pointer active:scale-[0.99] flex items-center justify-center gap-1.5 sm:gap-2 mt-1 sm:mt-2"
              >
                <span>Увійти в АРМ</span>
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                </svg>
              </button>
            </form>

            <div class="text-center text-[10px] sm:text-[11px] text-slate-500 pt-1.5 sm:pt-2 border-t border-slate-800/80">
              Служба Водопроводу та Каналізації WSN &bull; MVP AI Agent
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private attachEvents(): void {
    const form = this.container.querySelector('#login-form') as HTMLFormElement;
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const userInput = (this.container.querySelector('#login-username') as HTMLInputElement).value;
        const passInput = (this.container.querySelector('#login-password') as HTMLInputElement).value;

        const success = this.store.login(userInput, passInput);
        if (!success) {
          this.errorMessage = `Невірне ім'я користувача або пароль. Використовуйте ${CONFIG.AUTH.DEFAULT_ADMIN_USER} / ${CONFIG.AUTH.DEFAULT_ADMIN_PASS}.`;
          this.render();
        }
      });
    }

    const btnAutofill = this.container.querySelector('#btn-autofill');
    if (btnAutofill) {
      btnAutofill.addEventListener('click', () => {
        const userInput = this.container.querySelector('#login-username') as HTMLInputElement;
        const passInput = this.container.querySelector('#login-password') as HTMLInputElement;
        if (userInput && passInput) {
          userInput.value = CONFIG.AUTH.DEFAULT_ADMIN_USER;
          passInput.value = CONFIG.AUTH.DEFAULT_ADMIN_PASS;
          this.errorMessage = '';
          this.render();
        }
      });
    }
  }
}
