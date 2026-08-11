/**
 * UI Display Strings and Interaction Constants
 */
export const uiConfig = {
  GEO_PROVIDER_BUTTONS: {
    auto: { label: 'Авто', title: 'Спочатку Geodata.online, при відсутності результату — Nominatim' },
    geodata: { label: 'Geodata', title: 'Пошук лише через Geodata.online (api.dmsolutions.com.ua)' },
    nominatim: { label: 'Nominatim', title: 'Пошук лише через Nominatim (openstreetmap.org)' }
  } as const,

  GEO_SEARCH_MIN_CHARS: 3,
  GEO_SEARCH_DEBOUNCE_MS: 500,
  AUTO_GEOCODE_DEBOUNCE_MS: 700,

  CARD_SUBTITLE: 'Класифікація WSN 27994 / Обліковий запис WSN-SERVICE',

  NOTES_CLARIFICATION_PREFIX: 'Уточнення: ',

  LOGIN_ERROR_MESSAGE: (adminUser: string, adminPass: string): string =>
    `Невірне ім'я користувача або пароль. Використовуйте ${adminUser} / ${adminPass}.`,

  WAVE_BAR_COUNT: 32,

  DEFAULT_STATUS_LABEL: (statusId: number, statusName: string): string =>
    `${statusId} (${statusName})`
} as const;
