import { TicketStateStore } from '@/app/state/TicketStateStore';
import { ClarificationMode } from '@/shared/types';
import { escapeHtml } from '@/shared/utils/security';
import { appConfig, speechConfig, uiConfig } from '@/shared/config';
import { GeminiService } from '@/features/voice/application/GeminiService';
import { VoiceDictationService } from '@/features/voice/application/VoiceDictationService';

export class TranscriptPanelComponent {
  private store: TicketStateStore;
  private container: HTMLElement;
  private isPlayingAudio: boolean = false;
  private isRecording: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private currentSpokenText: string = '';
  private isInitialized: boolean = false;
  private audioPlayer: HTMLAudioElement;
  private unsubscribeStore?: () => void;
  private currentAudioUrl: string | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.store = TicketStateStore.getInstance();
    
    this.audioPlayer = new Audio();
    this.audioPlayer.addEventListener('timeupdate', () => this.updateAudioTime());
    this.audioPlayer.addEventListener('ended', () => {
      this.isPlayingAudio = false;
      this.updateControlsUI();
    });
    this.audioPlayer.addEventListener('play', () => {
      this.isPlayingAudio = true;
      this.updateControlsUI();
    });
    this.audioPlayer.addEventListener('pause', () => {
      this.isPlayingAudio = false;
      this.updateControlsUI();
    });
    this.audioPlayer.addEventListener('loadedmetadata', () => this.updateAudioTime());
  }

  public render(): void {
    if (!this.isInitialized) {
      this.renderShell();
      this.attachEventsDelegated();
      
      // Fix #2: Store Subscription for proper reactivity
      this.unsubscribeStore = this.store.subscribe(() => {
        this.updateProcessingOverlay();
        this.updateControlsUI();
        this.updateTranscriptList();
        this.updateSuggestedQuestions();
      });
      
      this.isInitialized = true;
    }
    
    this.updateProcessingOverlay();
    this.updateControlsUI();
    this.updateTranscriptList();
    this.updateSuggestedQuestions();
  }

  public destroy(): void {
    if (this.unsubscribeStore) {
      this.unsubscribeStore();
    }
    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
    }
    this.audioPlayer.pause();
    this.audioPlayer.src = '';
  }

  private renderShell(): void {
    this.container.innerHTML = `
      <div class="h-auto lg:h-full flex flex-col bg-slate-900 border-r border-slate-800/80 lg:overflow-hidden relative">
        
        <!-- Processing Loading Overlay -->
        <div id="processing-overlay" role="status" aria-live="polite" class="hidden absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div class="relative flex items-center justify-center">
            <div class="w-16 h-16 rounded-full border-4 border-sky-500/20 border-t-sky-500 animate-spin"></div>
            <div class="absolute text-2xl animate-pulse">✨</div>
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">AI-агент аналізує аудіозапис...</h3>
            <p class="text-xs text-sky-400/80 mt-1 max-w-xs">Виконується STT розпізнавання мовлення, автозаповнення полів картки WSN та геокодування адреси.</p>
          </div>
        </div>

        <!-- Audio Stream & Controls Header -->
        <div class="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col gap-3">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div class="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 w-full sm:w-auto">
              <div class="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <h2 class="text-sm font-bold text-white flex flex-wrap items-baseline gap-x-2 leading-tight">
                  <span class="truncate">Транскрипція розмови WSN</span>
                  <span id="audio-time-indicator" class="text-[10px] text-slate-400 font-normal whitespace-nowrap">00:00 / 00:00</span>
                </h2>
                <p id="stt-accuracy-indicator" class="text-[10px] sm:text-xs text-slate-400 truncate">STT: ${appConfig.STT_ENGINE} / Точність: 0%</p>
              </div>
            </div>

            <!-- Intercept Button -->
            <button id="btn-intercept-call" aria-label="Перехопити розмову" aria-pressed="false" class="w-full sm:w-auto px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1.001 1.001 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
              <span id="text-intercept-call" class="truncate">Перехопити розмову</span>
            </button>
          </div>

          <!-- Real Audio Processing Controls (Record Mic & Upload File) -->
          <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
            <button id="btn-record-mic" aria-label="Запис з мікрофона" aria-pressed="false" class="py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
              <span id="text-record-mic">🎙️ Запис з мікрофона</span>
            </button>

            <label for="input-audio-file" class="py-2 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer select-none" aria-label="Завантажити аудіофайл">
              📁 Файл (.mp3/.wav)
              <input type="file" id="input-audio-file" accept="audio/*" class="hidden" />
            </label>
          </div>

          <!-- Audio Waveform Visualization & Playback -->
          <div class="bg-slate-900/90 rounded-xl p-3 border border-slate-800 flex items-center gap-3">
            <button id="btn-play-audio" aria-label="Відтворення аудіо" aria-pressed="false" class="w-9 h-9 rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center transition-all shadow-md shadow-sky-600/30 flex-shrink-0">
              <svg id="icon-play-audio" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>

            <!-- Animated Audio Wavebar -->
            <div id="audio-waveform-container" class="flex-1 flex items-center gap-1 h-8 px-2 overflow-hidden" aria-hidden="true">
              ${Array.from({ length: uiConfig.WAVE_BAR_COUNT }).map((_, i) => `
                <div class="w-1 bg-sky-400/80 rounded-full transition-all duration-300 h-2 opacity-40 wave-bar" style="animation-delay: ${(i * 0.05).toFixed(2)}s;"></div>
              `).join('')}
            </div>

            <span id="text-audio-status" class="text-xs font-mono text-slate-400 flex-shrink-0" aria-live="polite">
              Пауза
            </span>
          </div>

          <!-- Mode Toggle Switch (Text Hints vs Voice Agent) -->
          <div class="flex items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-800">
            <span class="text-xs font-medium text-slate-300" id="mode-toggle-label">Режим роботи AI-агента:</span>
            <div class="flex bg-slate-950 p-1 rounded-lg border border-slate-800" role="group" aria-labelledby="mode-toggle-label">
              <button data-mode="TEXT_HINTS" aria-pressed="false" class="btn-mode-toggle text-xs font-semibold px-3 py-1 rounded-md transition-all text-slate-400 hover:text-slate-200">
                💬 Текстові підказки
              </button>
              <button data-mode="VOICE_DIALOG" aria-pressed="false" class="btn-mode-toggle text-xs font-semibold px-3 py-1 rounded-md transition-all text-slate-400 hover:text-slate-200">
                🗣️ Голосовий діалог
              </button>
            </div>
          </div>
        </div>

        <!-- Scrollable Transcript Content -->
        <div id="transcript-list" class="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-900/50" aria-live="polite">
        </div>

        <!-- AI Suggested Questions Section -->
        <div class="p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <svg class="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              Рекомендовані питання від AI:
            </h3>
            <span class="text-[10px] text-slate-400">Натисніть щоб додати до Приміток</span>
          </div>

          <div id="suggested-questions-list" class="flex flex-col gap-1.5">
          </div>
        </div>
      </div>
    `;
  }

  private updateAudioTime(): void {
    const indicator = this.container.querySelector('#audio-time-indicator');
    if (!indicator) return;

    const formatTime = (time: number) => {
      if (isNaN(time) || !isFinite(time)) return '00:00';
      const m = Math.floor(time / 60).toString().padStart(2, '0');
      const s = Math.floor(time % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    };

    const current = formatTime(this.audioPlayer.currentTime);
    const total = formatTime(this.audioPlayer.duration);
    indicator.textContent = `${current} / ${total}`;
  }

  private updateProcessingOverlay(): void {
    const overlay = this.container.querySelector('#processing-overlay');
    if (overlay) {
      if (this.store.getIsProcessingAudio()) {
        overlay.classList.remove('hidden');
      } else {
        overlay.classList.add('hidden');
      }
    }
  }

  private updateControlsUI(): void {
    const isIntercepted = this.store.getCallIntercepted();
    const mode = this.store.getClarificationMode();
    const result = this.store.getResult();

    // 1. Accuracy
    const sttAccuracy = this.container.querySelector('#stt-accuracy-indicator');
    if (sttAccuracy) {
      sttAccuracy.textContent = `STT: ${appConfig.STT_ENGINE} / Точність: ${(result.confidence.speechRecognition * 100).toFixed(0)}%`;
    }

    // 2. Intercept Button
    const btnIntercept = this.container.querySelector('#btn-intercept-call');
    const txtIntercept = this.container.querySelector('#text-intercept-call');
    if (btnIntercept && txtIntercept) {
      if (isIntercepted) {
        btnIntercept.className = 'w-full sm:w-auto px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0 bg-amber-600 hover:bg-amber-500 text-white ring-2 ring-amber-400/50';
        txtIntercept.textContent = 'Повернути AI-агенту';
        btnIntercept.setAttribute('aria-pressed', 'true');
      } else {
        btnIntercept.className = 'w-full sm:w-auto px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0 bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20';
        txtIntercept.textContent = 'Перехопити розмову';
        btnIntercept.setAttribute('aria-pressed', 'false');
      }
    }

    // 3. Record Button
    const btnRecord = this.container.querySelector('#btn-record-mic');
    const txtRecord = this.container.querySelector('#text-record-mic');
    if (btnRecord && txtRecord) {
      if (this.isRecording) {
        btnRecord.className = 'py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white animate-pulse ring-2 ring-rose-400/50';
        txtRecord.textContent = '⏹️ Зупинити запис';
        btnRecord.setAttribute('aria-pressed', 'true');
      } else {
        btnRecord.className = 'py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white shadow-md shadow-sky-600/20';
        txtRecord.textContent = '🎙️ Запис з мікрофона';
        btnRecord.setAttribute('aria-pressed', 'false');
      }
    }

    // 4. Play Button
    const btnPlay = this.container.querySelector('#btn-play-audio');
    const iconPlay = this.container.querySelector('#icon-play-audio');
    if (btnPlay && iconPlay) {
      btnPlay.setAttribute('aria-pressed', this.isPlayingAudio.toString());
      if (this.isPlayingAudio) {
        iconPlay.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
      } else {
        iconPlay.innerHTML = '<path d="M8 5v14l11-7z"/>';
      }
    }

    // 5. Audio Status & Waveform
    const txtStatus = this.container.querySelector('#text-audio-status');
    if (txtStatus) {
      txtStatus.textContent = this.isRecording ? 'Запис...' : this.isPlayingAudio ? 'Відтворення...' : 'Пауза';
    }
    
    const waveBars = this.container.querySelectorAll('.wave-bar');
    const isActive = this.isPlayingAudio || this.isRecording;
    waveBars.forEach(bar => {
      if (isActive) {
        bar.classList.add('animate-wave-bar');
        bar.classList.remove('h-2', 'opacity-40');
        (bar as HTMLElement).style.height = Math.floor(Math.random() * 20 + 8) + 'px';
      } else {
        bar.classList.remove('animate-wave-bar');
        bar.classList.add('h-2', 'opacity-40');
        (bar as HTMLElement).style.height = '6px';
      }
    });

    // 6. Mode Toggles
    const modeBtns = this.container.querySelectorAll<HTMLButtonElement>('.btn-mode-toggle');
    modeBtns.forEach(btn => {
      const btnMode = btn.dataset.mode as ClarificationMode;
      if (btnMode === mode) {
        btn.className = 'btn-mode-toggle text-xs font-semibold px-3 py-1 rounded-md transition-all bg-sky-600 text-white shadow-sm';
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.className = 'btn-mode-toggle text-xs font-semibold px-3 py-1 rounded-md transition-all text-slate-400 hover:text-slate-200';
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  private updateTranscriptList(): void {
    const list = this.container.querySelector('#transcript-list');
    if (!list) return;

    const result = this.store.getResult();
    const transcript = typeof result.transcript === 'string' ? result.transcript : '';
    const transcriptLines = transcript.split('\n').filter(l => l.trim().length > 0);

    if (transcriptLines.length === 0) {
      const emptyState = '<p class="text-sm text-slate-500 italic text-center py-8">Транскрипт з’явиться після обробки аудіо.</p>';
      if (list.innerHTML !== emptyState) {
        list.innerHTML = emptyState;
      }
      return;
    }

    const newHTML = transcriptLines.map((line) => {
      const isAI = line.includes('AI-Агент');
      const match = line.match(/^(\[\d{2}:\d{2}])\s*(.*?):\s*(.*)$/);

      const timestamp = match?.[1] ?? '';
      const speaker = match?.[2] ?? (isAI ? 'AI-Агент' : 'Заявник');
      const text = match?.[3] ?? line;

      return `
        <div class="flex gap-3 text-xs leading-relaxed justify-start">
          <div class="w-7 h-7 rounded-lg ${isAI ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'} flex items-center justify-center flex-shrink-0 font-bold text-[10px]" aria-hidden="true">
            ${isAI ? 'AI' : 'УБ'}
          </div>
          <div class="flex-1 bg-slate-950/80 border ${isAI ? 'border-sky-900/40' : 'border-slate-800'} rounded-xl p-3 shadow-sm">
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold ${isAI ? 'text-sky-400' : 'text-slate-300'}">${escapeHtml(speaker)}</span>
              <span class="text-[10px] text-slate-500 font-mono">${escapeHtml(timestamp)}</span>
            </div>
            <p class="text-slate-200 text-xs">${escapeHtml(text)}</p>
          </div>
        </div>
      `;
    }).join('');

    if (list.innerHTML !== newHTML) {
      list.innerHTML = newHTML;
    }
  }

  private updateSuggestedQuestions(): void {
    const list = this.container.querySelector('#suggested-questions-list');
    if (!list) return;

    const result = this.store.getResult();
    const suggestedQuestions = result.suggestedQuestions || [];

    const newHTML = suggestedQuestions.length > 0 ? suggestedQuestions.map(q => `
      <button data-question="${encodeURIComponent(q)}" aria-label="Додати питання" class="btn-suggested-question text-left text-xs bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/60 hover:border-sky-500/80 text-sky-200 p-2.5 rounded-lg transition-all flex items-center justify-between group">
        <span>💬 "${escapeHtml(q)}"</span>
        <span class="text-[10px] font-semibold bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded opacity-80 group-hover:opacity-100">+ Додати</span>
      </button>
    `).join('') : `
      <p class="text-xs text-slate-500 italic">Немає додаткових рекомендацій від AI.</p>
    `;

    if (list.innerHTML !== newHTML) {
      list.innerHTML = newHTML;
    }
  }

  private attachEventsDelegated(): void {
    this.container.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (target.closest('#btn-play-audio')) {
        if (!this.audioPlayer.src || this.audioPlayer.src.endsWith(window.location.host + '/')) {
          alert('Немає аудіофайлу для відтворення');
          return;
        }
        if (this.audioPlayer.paused) {
          this.audioPlayer.play().catch(err => console.error('Audio play error', err));
        } else {
          this.audioPlayer.pause();
        }
        return;
      }

      if (target.closest('#btn-record-mic')) {
        this.isRecording ? this.stopMicrophoneRecording() : this.startMicrophoneRecording();
        return;
      }

      if (target.closest('#btn-intercept-call')) {
        this.store.toggleCallIntercept();
        // UI updates automatically via store subscription now
        return;
      }

      const modeBtn = target.closest('.btn-mode-toggle') as HTMLButtonElement | null;
      if (modeBtn?.dataset.mode) {
        this.store.setClarificationMode(modeBtn.dataset.mode as ClarificationMode);
        return;
      }

      const questionBtn = target.closest('.btn-suggested-question') as HTMLButtonElement | null;
      if (questionBtn?.dataset.question) {
        const questionText = decodeURIComponent(questionBtn.dataset.question);
        if (questionText) {
          this.store.appendSuggestedQuestion(questionText);
        }
        return;
      }
    });

    this.container.addEventListener('change', async (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.id === 'input-audio-file' && target.files?.[0]) {
        await this.processAudioBlob(target.files[0]);
        target.value = '';
      }
    });
  }

  private async startMicrophoneRecording(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.currentSpokenText = '';
      this.mediaRecorder = new MediaRecorder(stream);

      const dictation = VoiceDictationService.getInstance();
      if (dictation.isSupported()) {
        dictation.startListening();
      }

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || speechConfig.DEFAULT_AUDIO_MIME_TYPE });
        stream.getTracks().forEach(track => track.stop());
        await this.processAudioBlob(audioBlob, this.currentSpokenText);
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.updateControlsUI();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`Не вдалося отримати доступ до мікрофона: ${errorMessage}`);
      this.isRecording = false;
      this.updateControlsUI();
    }
  }

  private stopMicrophoneRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      const dictation = VoiceDictationService.getInstance();
      if (dictation.isSupported()) {
        this.currentSpokenText = dictation.stopListening();
      }
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.updateControlsUI();
    }
  }

  private async processAudioBlob(blob: Blob, spokenText?: string): Promise<void> {
    // Release previous blob URL to prevent memory leaks
    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
    }
    
    // Bind the new audio blob to the real HTMLAudioElement player
    this.currentAudioUrl = URL.createObjectURL(blob);
    this.audioPlayer.src = this.currentAudioUrl;
    this.audioPlayer.load();

    try {
      this.store.setIsProcessingAudio(true);
      // Overlay updates automatically via subscription, but calling explicitly is safe too
      this.updateProcessingOverlay();

      const gemini = GeminiService.getInstance();
      const result = await gemini.processAudio(blob, spokenText);
      await this.store.loadRealResult(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`Помилка аналізу аудіо: ${errorMessage}`);
    } finally {
      this.store.setIsProcessingAudio(false);
      this.updateProcessingOverlay();
    }
  }
}
