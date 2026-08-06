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

  // Geodata.online (DM Solutions) API
  GEODATA_BASE_URL: 'https://api.dmsolutions.com.ua:2661',
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
