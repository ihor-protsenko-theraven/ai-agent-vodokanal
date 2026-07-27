/**
 * Geocoding & OpenStreetMap Configuration
 */
export const geoConfig = {
  USER_AGENT: 'Vodokanal-AI-Dispatcher/1.0',
  NOMINATIM_BASE_URL: 'https://nominatim.openstreetmap.org/search',
  DEFAULT_COUNTRY_SUFFIX: 'Україна',
  DEFAULT_CITY_SUFFIX: 'Київ, Україна',
  DEFAULT_COORDINATES: '50.4501, 30.5234',
  VINNYTSIA_COORDINATES: '49.2312, 28.4355',
  DEFAULT_CITY_NAME: 'Київ',

  KNOWN_CITIES: {
    'вінниця': 'Вінниця',
    'вінниці': 'Вінниця',
    'київ': 'Київ',
    'києві': 'Київ',
    'харків': 'Харків',
    'харкові': 'Харків',
    'одеса': 'Одеса',
    'одесі': 'Одеса',
    'дніпро': 'Дніпро',
    'дніпрі': 'Дніпро',
    'львів': 'Львів',
    'львові': 'Львів',
    'запоріжжя': 'Запоріжжя'
  } as Record<string, string>
} as const;
