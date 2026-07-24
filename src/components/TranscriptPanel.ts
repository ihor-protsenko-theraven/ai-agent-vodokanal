import { TicketStateStore } from '../services/TicketStateStore';
import { ClarificationMode } from '../types/ticket';
import { escapeHtml } from '../utils/security';
import { CONFIG } from '../config/constants';
import { GeminiService } from '../services/GeminiService';
import { VoiceDictationService } from '../services/VoiceDictationService';

export class TranscriptPanelComponent {
  private store: TicketStateStore;
  private container: HTMLElement;
  private isPlayingAudio: boolean = false;
  private isRecording: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private currentSpokenText: string = '';

  constructor(container: HTMLElement) {
    this.container = container;
    this.store = TicketStateStore.getInstance();
  }

  public render(): void {
    const result = this.store.getResult();
    const mode = this.store.getClarificationMode();
    const isIntercepted = this.store.getCallIntercepted();
    const isProcessing = this.store.getIsProcessingAudio();
    const suggestedQuestions = result.suggestedQuestions || [];

    // Parse transcript lines into structured objects
    const transcriptLines = result.transcript.split('\n').filter(l => l.trim().length > 0);

    this.container.innerHTML = `
      <div class="h-full flex flex-col bg-slate-900 border-r border-slate-800/80 lg:overflow-hidden overflow-y-auto relative">
        
        <!-- Processing Loading Overlay -->
        ${isProcessing ? `
          <div class="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-3 sm:space-y-4">
            <div class="relative flex items-center justify-center">
              <div class="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-sky-500/20 border-t-sky-500 animate-spin"></div>
              <div class="absolute text-xl sm:text-2xl animate-pulse">✨</div>
            </div>
            <div>
              <h3 class="text-xs sm:text-sm font-bold text-white">AI-агент аналізує аудіозапис...</h3>
              <p class="text-[10px] sm:text-xs text-sky-400/80 mt-1 max-w-xs">Виконується STT розпізнавання мовлення, автозаповнення полів картки WSN та геокодування адреси.</p>
            </div>
          </div>
        ` : ''}

        <!-- Audio Stream & Controls Header -->
        <div class="p-3 sm:p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col gap-2 sm:gap-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 sm:gap-2">
              <div class="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                </svg>
              </div>
              <div>
                <h2 class="text-[10px] sm:text-sm font-bold text-white flex items-center gap-1.5 sm:gap-2">
                  Транскрипція розмови WSN
                  <span class="text-[9px] sm:text-[10px] text-slate-400 font-normal hidden xs:inline">00:32 / 01:45</span>
                </h2>
                <p class="text-[9px] sm:text-xs text-slate-400">STT Модуль: ${CONFIG.APP.STT_ENGINE} / Точність: ${(result.confidence.speechRecognition * 100).toFixed(0)}%</p>
              </div>
            </div>

            <!-- Intercept Button -->
            <button id="btn-intercept-call" class="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all shadow-md ${isIntercepted
        ? 'bg-amber-600 hover:bg-amber-500 text-white ring-2 ring-amber-400/50'
        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
      }">
              <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1.001 1.001 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
              <span class="hidden sm:inline">${isIntercepted ? 'Повернути AI-агенту' : 'Перехопити розмову'}</span>
            </button>
          </div>

          <!-- Real Audio Processing Controls (Record Mic & Upload File) -->
          <div class="grid grid-cols-2 gap-1.5 sm:gap-2 pt-1 border-t border-slate-800/80">
            <button id="btn-record-mic" class="py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${this.isRecording
        ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse ring-2 ring-rose-400/50'
        : 'bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white shadow-md shadow-sky-600/20'
      }">
              ${this.isRecording ? '⏹️ Зупинити' : '🎙️ Запис'}
              <span class="hidden sm:inline">${this.isRecording ? 'запис' : 'з мікрофона'}</span>
            </button>

            <label for="input-audio-file" class="py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-[10px] sm:text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer select-none">
              📁 Файл
              <span class="hidden sm:inline">(.mp3/.wav)</span>
              <input type="file" id="input-audio-file" accept="audio/*" class="hidden" />
            </label>
          </div>

          <!-- Audio Waveform Visualization & Playback -->
          <div class="bg-slate-900/90 rounded-xl p-2 sm:p-3 border border-slate-800 flex items-center gap-2 sm:gap-3">
            <button id="btn-play-audio" class="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center transition-all shadow-md shadow-sky-600/30 flex-shrink-0">
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                ${this.isPlayingAudio
        ? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'
        : '<path d="M8 5v14l11-7z"/>'}
              </svg>
            </button>

            <!-- Animated Audio Wavebar -->
            <div class="flex-1 flex items-center gap-0.5 sm:gap-1 h-6 sm:h-8 px-1 sm:px-2 overflow-hidden">
              ${Array.from({ length: 32 }).map((_, i) => `
                <div class="w-0.5 sm:w-1 bg-sky-400/80 rounded-full transition-all duration-300 ${this.isPlayingAudio || this.isRecording ? 'animate-wave-bar' : 'h-1.5 sm:h-2 opacity-40'}" style="animation-delay: ${(i * 0.05).toFixed(2)}s; height: ${this.isPlayingAudio || this.isRecording ? Math.floor(Math.random() * 20 + 8) + 'px' : '6px'}"></div>
              `).join('')}
            </div>

            <span class="text-[10px] sm:text-xs font-mono text-slate-400 flex-shrink-0">
              ${this.isRecording ? 'Запис...' : this.isPlayingAudio ? 'Відтворення...' : 'Пауза'}
            </span>
          </div>

          <!-- Mode Toggle Switch (Text Hints vs Voice Agent) -->
          <div class="flex items-center justify-between bg-slate-900 p-1.5 sm:p-2 rounded-xl border border-slate-800">
            <span class="text-[10px] sm:text-xs font-medium text-slate-300">Режим роботи AI-агента:</span>
            <div class="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button data-mode="TEXT_HINTS" class="btn-mode-toggle text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 rounded-md transition-all ${mode === 'TEXT_HINTS'
        ? 'bg-sky-600 text-white shadow-sm'
        : 'text-slate-400 hover:text-slate-200'
      }">
                💬 Текст
                <span class="hidden sm:inline">підказки</span>
              </button>
              <button data-mode="VOICE_DIALOG" class="btn-mode-toggle text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 rounded-md transition-all ${mode === 'VOICE_DIALOG'
        ? 'bg-sky-600 text-white shadow-sm'
        : 'text-slate-400 hover:text-slate-200'
      }">
                🗣️ Голос
                <span class="hidden sm:inline">діалог</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Scrollable Transcript Content -->
        <div class="flex-1 p-2 sm:p-4 overflow-y-auto space-y-2 sm:space-y-3.5 bg-slate-900/50">
          ${transcriptLines.map((line) => {
        const isAI = line.includes('AI-Агент');
        const match = line.match(/^(\[\d{2}:\d{2}])\s*(.*?):\s*(.*)$/);

        const timestamp = match ? match[1] : '';
        const speaker = match ? match[2] : (isAI ? 'AI-Агент' : 'Заявник');
        const text = match ? match[3] : line;

        return `
              <div class="flex gap-2 sm:gap-3 text-[10px] sm:text-xs leading-relaxed ${isAI ? 'justify-start' : 'justify-start'}">
                <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg ${isAI ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'} flex items-center justify-center flex-shrink-0 font-bold text-[9px] sm:text-[10px]">
                  ${isAI ? 'AI' : 'УБ'}
                </div>
                <div class="flex-1 bg-slate-950/80 border ${isAI ? 'border-sky-900/40' : 'border-slate-800'} rounded-xl p-2 sm:p-3 shadow-sm">
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-bold ${isAI ? 'text-sky-400' : 'text-slate-300'}">${escapeHtml(speaker)}</span>
                    <span class="text-[9px] sm:text-[10px] text-slate-500 font-mono">${escapeHtml(timestamp)}</span>
                  </div>
                  <p class="text-slate-200 text-[10px] sm:text-xs">${escapeHtml(text)}</p>
                </div>
              </div>
            `;
      }).join('')}
        </div>

        <!-- AI Suggested Questions Section -->
        <div class="p-2 sm:p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-1.5 sm:gap-2">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-[10px] sm:text-xs font-bold text-sky-400 flex items-center gap-1 sm:gap-1.5">
              <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              Рекомендовані питання
              <span class="hidden sm:inline">від AI (suggestedQuestions):</span>
            </h3>
            <span class="text-[9px] sm:text-[10px] text-slate-400 hidden xs:inline">Натисніть щоб додати до Приміток</span>
          </div>

          <div class="flex flex-col gap-1 sm:gap-1.5">
            ${suggestedQuestions.length > 0 ? suggestedQuestions.map(q => `
              <button data-question="${encodeURIComponent(q)}" class="btn-suggested-question text-left text-[10px] sm:text-xs bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/60 hover:border-sky-500/80 text-sky-200 p-2 sm:p-2.5 rounded-lg transition-all flex items-center justify-between group">
                <span class="truncate">💬 "${escapeHtml(q)}"</span>
                <span class="text-[9px] sm:text-[10px] font-semibold bg-sky-500/20 text-sky-300 px-1.5 sm:px-2 py-0.5 rounded opacity-80 group-hover:opacity-100 flex-shrink-0">+ Додати</span>
              </button>
            `).join('') : `
              <p class="text-[10px] sm:text-xs text-slate-500 italic">Немає додаткових рекомендацій від AI.</p>
            `}
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private attachEvents(): void {
    // Microphone Recording Toggle
    const btnRecord = this.container.querySelector<HTMLButtonElement>('#btn-record-mic');
    if (btnRecord) {
      btnRecord.addEventListener('click', () => {
        if (this.isRecording) {
          this.stopMicrophoneRecording();
        } else {
          this.startMicrophoneRecording();
        }
      });
    }

    // File Upload Handler
    const inputAudio = this.container.querySelector<HTMLInputElement>('#input-audio-file');
    if (inputAudio) {
      inputAudio.addEventListener('change', async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          await this.processAudioBlob(file);
        }
      });
    }

    // Play/Pause audio button
    const btnPlay = this.container.querySelector('#btn-play-audio');
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        this.isPlayingAudio = !this.isPlayingAudio;
        this.render();
      });
    }

    // Intercept call button
    const btnIntercept = this.container.querySelector('#btn-intercept-call');
    if (btnIntercept) {
      btnIntercept.addEventListener('click', () => {
        this.store.toggleCallIntercept();
      });
    }

    // Mode toggle buttons
    const modeBtns = this.container.querySelectorAll<HTMLButtonElement>('.btn-mode-toggle');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode as ClarificationMode;
        if (mode) {
          this.store.setClarificationMode(mode);
        }
      });
    });

    // Suggested questions click to append
    const questionBtns = this.container.querySelectorAll<HTMLButtonElement>('.btn-suggested-question');
    questionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const questionText = decodeURIComponent(btn.dataset.question || '');
        if (questionText) {
          this.store.appendSuggestedQuestion(questionText);
        }
      });
    });
  }

  private async startMicrophoneRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.currentSpokenText = '';
      this.mediaRecorder = new MediaRecorder(stream);

      // Start Web Speech STT dictation if supported by browser
      const dictation = VoiceDictationService.getInstance();
      if (dictation.isSupported()) {
        dictation.startListening();
      }

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await this.processAudioBlob(audioBlob, this.currentSpokenText);
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.render();
    } catch (err) {
      alert(`Не вдалося отримати доступ до мікрофона: ${(err as Error).message}`);
      this.isRecording = false;
      this.render();
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
      this.render();
    }
  }

  private async processAudioBlob(blob: Blob, spokenText?: string): Promise<void> {
    this.store.setIsProcessingAudio(true);
    try {
      const gemini = GeminiService.getInstance();
      const result = await gemini.processAudio(blob, spokenText);
      this.store.loadRealResult(result);
    } catch (err) {
      alert(`Помилка аналізу аудіо: ${(err as Error).message}`);
      this.store.setIsProcessingAudio(false);
    }
  }
}
