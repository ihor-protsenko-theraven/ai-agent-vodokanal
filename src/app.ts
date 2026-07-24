import { TicketStateStore } from './services/TicketStateStore';
import { HeaderComponent } from './components/Header';
import { TranscriptPanelComponent } from './components/TranscriptPanel';
import { TicketFormPanelComponent } from './components/TicketFormPanel';
import { DuplicateModalComponent } from './components/DuplicateModal';
import { SubmissionToastComponent } from './components/SubmissionToast';
import { LoginPageComponent } from './components/LoginPage';

export class TicketDispatcherUI {
  private store: TicketStateStore;

  private loginPageComponent!: LoginPageComponent;
  private headerComponent!: HeaderComponent;
  private transcriptPanelComponent!: TranscriptPanelComponent;
  private ticketFormPanelComponent!: TicketFormPanelComponent;
  private duplicateModalComponent!: DuplicateModalComponent;
  private submissionToastComponent!: SubmissionToastComponent;

  private rootContainer: HTMLElement;
  private isWorkspaceLayoutBuilt: boolean = false;

  constructor(rootContainerId: string) {
    const el = document.getElementById(rootContainerId);
    if (!el) {
      throw new Error(`Root element with id "${rootContainerId}" not found in DOM.`);
    }
    this.rootContainer = el;
    this.store = TicketStateStore.getInstance();
  }

  public init(): void {
    // Initial render check
    this.renderAll();

    // Subscribe to state store changes
    this.store.subscribe(() => {
      this.renderAll();
    });
  }

  private buildLoginPageLayout(): void {
    this.rootContainer.innerHTML = `<div id="login-root"></div>`;
    const loginEl = document.getElementById('login-root')!;
    this.loginPageComponent = new LoginPageComponent(loginEl);
    this.isWorkspaceLayoutBuilt = false;
  }

  private buildWorkspaceBaseLayout(): void {
    this.rootContainer.innerHTML = `
      <div class="min-h-screen flex flex-col bg-slate-900 text-slate-100 font-sans">
        <!-- Header Root -->
        <div id="header-root"></div>

        <!-- Main Workspace (50/50 Split Screen Layout) -->
        <main class="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden h-[calc(100vh-65px)]">
          <!-- Left 50%: Transcript & AI Prompts -->
          <section id="transcript-root" class="h-full overflow-hidden"></section>

          <!-- Right 50%: Ticket Creation Form -->
          <section id="form-root" class="h-full overflow-hidden"></section>
        </main>

        <!-- Modals & Overlay Roots -->
        <div id="duplicate-modal-root"></div>
        <div id="toast-root"></div>
      </div>
    `;

    const headerEl = document.getElementById('header-root')!;
    const transcriptEl = document.getElementById('transcript-root')!;
    const formEl = document.getElementById('form-root')!;
    const duplicateModalEl = document.getElementById('duplicate-modal-root')!;
    const toastEl = document.getElementById('toast-root')!;

    this.headerComponent = new HeaderComponent(headerEl);
    this.transcriptPanelComponent = new TranscriptPanelComponent(transcriptEl);
    this.ticketFormPanelComponent = new TicketFormPanelComponent(formEl);
    this.duplicateModalComponent = new DuplicateModalComponent(duplicateModalEl);
    this.submissionToastComponent = new SubmissionToastComponent(toastEl);
    this.isWorkspaceLayoutBuilt = true;
  }

  private renderAll(): void {
    if (!this.store.isAuthenticated()) {
      if (this.isWorkspaceLayoutBuilt || !document.getElementById('login-root')) {
        this.buildLoginPageLayout();
      }
      this.loginPageComponent.render();
      return;
    }

    if (!this.isWorkspaceLayoutBuilt) {
      this.buildWorkspaceBaseLayout();
    }

    this.headerComponent.render();
    this.transcriptPanelComponent.render();
    this.ticketFormPanelComponent.render();
    this.duplicateModalComponent.render();
    this.submissionToastComponent.render();
  }
}
