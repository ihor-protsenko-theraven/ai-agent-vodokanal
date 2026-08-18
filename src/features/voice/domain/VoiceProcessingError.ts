/**
 * A recoverable failure to obtain a real ticket draft from voice input.
 *
 * It is intentionally not converted into a mock ticket: an operator must
 * either retry audio processing or create/fill a ticket explicitly.
 */
export class VoiceProcessingError extends Error {
  constructor(
    public readonly code: 'NO_TRANSCRIPT_AVAILABLE',
    message: string
  ) {
    super(message);
    this.name = 'VoiceProcessingError';
  }
}
