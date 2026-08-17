/**
 * Geocoding & OpenStreetMap Configuration
 */
export const geoConfig = {
  USER_AGENT: 'Vodokanal-AI-Dispatcher/1.0',
  NOMINATIM_BASE_URL: 'https://nominatim.openstreetmap.org/search',
  NOMINATIM_REVERSE_URL: 'https://nominatim.openstreetmap.org/reverse',
  NOMINATIM_ACCEPT_LANGUAGE: 'uk',
  NOMINATIM_SEARCH_LIMIT: 3,
  NOMINATIM_GEOCODE_LIMIT: 1,
  DEFAULT_COUNTRY_SUFFIX: 'Україна',
  DEFAULT_CITY_SUFFIX: 'Київ, Україна',
  // Used only to normalize an address when the caller does not name a city.
  // It is not a coordinate fallback.
  DEFAULT_CITY_NAME: 'Київ',
  // FullAddress and Houses return coordinates with up to six decimal places.
  // Keep that precision: four decimal places are roughly an 11 m error.
  COORDINATE_PRECISION: 6,
  GEOCODING_PROVIDERS: ['auto', 'geodata', 'nominatim'] as const,

  // Street-type words used for address normalization (Geodata API)
  STREET_TYPE_ALIASES: {
    'вулиця': 'вул',
    'проспект': 'просп',
    'провулок': 'пров',
    'бульвар': 'бул',
    'майдан': 'майд',
    'набережна': 'наб',
    'площа': 'площ',
    'місто': 'м.'
  } as Record<string, string>,
  STREET_TYPE_KEYWORDS: [
    'вул', 'вулиця', 'просп', 'проспект', 'пров', 'провулок', 'бул', 'бульвар',
    'майд', 'майдан', 'шосе', 'наб', 'набережна', 'площ', 'площа'
  ] as const,
  COUNTRY_SUFFIX_PATTERN: /Україна/gi,

  // Geodata.online (DM Solutions) API
  GEODATA_BASE_URL: 'https://api.dmsolutions.com.ua:2661',
  GEODATA_ADDRESS_PATH: '/api/Address',
  GEODATA_FULL_ADDRESS_PATH: '/api/FullAddress',
  GEODATA_CITIES_PATH: '/api/Cities',
  GEODATA_STREETS_PATH: '/api/Streets',
  GEODATA_HOUSES_PATH: '/api/Houses',
  GEODATA_REVERSE_GEOCODING_PATH: '/api/ReverseGeocoding',
  GEODATA_TOKEN: 'KYefd4ibDVRDZFZNEOARXk_JswcC6e5V7DSzcjzWI3EZwFlQEihSAAx7xOWITrcAHRrny-Qdm9tDupm23K-dVPZqUGj11fmqjUuuLenLsu_kgycQAK4URw7ptfar9rzIsBNMvH77YLGjCrMsU_Nc16DciDGLs22Wkum795fv9XmPU6U2K1JQ_BM1bb698UJGfbjibvTkHKcuIHFtxu9Tn_At3OHqs79JfS8NYO1QEVsb4NYsvnX65RjZ6VuoTmctPmVAD8GtkZlK2A8SZyHuTWhvZzgZjqRj2huIyd59iFh-LV3XIhNx_Yi2u1nt7s69MiCi49cwg5YCQI40eqSXTHczj4HERj8KhVXEa1AFc2QAItPu9tUeevHCEFZURbJS4ktij3PSlEjZh2sLE2WEBtqyw1xVRsK_bMtMbrvSrpES9hc1xSUBV3NQvxAYS5uR9OJNd3IV2M7wCF22I8RYWjdAoiaUvT1JSkgy-u15fBPeB1_WZnUsunG8O0MUHqcx',
  GEODATA_LANG: 'uk_UA',

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
