/**
 * Voice Dictation & Speech Recognition Constants
 */
export const speechConfig = {
  RECOGNITION_LANG: 'uk-UA',
  DEFAULT_AUDIO_MIME_TYPE: 'audio/webm',
  DEFAULT_FALLBACK_PHONE: '+380501234567',
  DEFAULT_DICTATION_PROMPT: 'У нас витік питної води на вулиці Хрещатик 15!',
  DEFAULT_APPLICANT_NAME: 'Громадянин (із голосового звернення)',
  FALLBACK_ADDRESS_SUFFIX: 'адреса з надиктованого голосу',
  NOTES_PREFIX: 'Надиктовано оператором: ',
  SUGGESTED_QUESTIONS: [
    'Уточніть підʼїзд або орієнтир обʼєкта?',
    'Чи є загроза підтоплення суміжних будівель або підвалів?'
  ]
} as const;
