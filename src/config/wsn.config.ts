/**
 * Water Supply Network (WSN) API and Domain Identifiers
 */
export const wsnConfig = {
  CLASS_ID: 27772,
  APPEAL_TYPE_KIND_UNIT_ID: 27994, // KindUnitID for "Тип звернення" objects in GetList
  CONSULTATION_APPEAL_TYPE: 'Консультація / Тарифи',
  DEFAULT_STATUS_ID: 5996,
  DEFAULT_STATUS_NAME: 'На виконання',
  OPERATOR_ID: 'OPERATOR-402',
  OPERATOR_DISPLAY: '#402 (WSN-AUTH)',
  SERVICE_ACCOUNT: 'WSN-AI-AGENT-SERVICE',
  // State IDs for unclosed tickets (active states that should be checked for duplicates)
  UNCLOSED_STATE_IDS: [5041, 5996, 5999, 5003], // Different active ticket states
  PROPERTIES: {
    APPEAL_TYPE: 'f1958',        // Тип звернення
    TICKET_TYPE: 'f1972',        // Тип заявки
    TICKET_TYPE_SYSTEM_ID: 10197, // System Type ID for "Тип заявки" (works with API)
    APPLICANT_NAME: 'f1961',     // ПІБ заявника
    APPLICANT_ADDRESS: 'f1960',  // Адреса проживання заявника
    ADDRESS_TEXT: 'f_389',       // Текст адреси аварії
    COORDINATES: 'f_420',       // Координати
    PHONE_NUMBER: 'f1981',      // Телефон заявника
    INCIDENT_DATE_TIME: 'f1258', // Дата й час аварії
    NOTES: 'f328',              // Примітки / Зміст звернення
    // Additional system fields from template
    AUTOFILL_FIELD: 'f_296',    // System autofill field
    DOCUMENT_DATE: 'f_297',     // Дата документа
    SYSTEM_FIELD_1265: 'f1265', // System field 1265
    INIT_FIELD_1268: 'f1268',   // Init field 1268 (array)
    INIT_FIELD_1954: 'f1954',   // Init field 1954 (array)
    INIT_FIELD_1974: 'f1974',   // Init field 1974 (array)
    INIT_FIELD_221: 'f_221'     // Init field 221 (array)
  },
  OPTIONS: {
    // Values must match GetList titles for kindUnitID 27994 (Тип звернення)
    APPEAL_TYPES: [
      'Витік води',
      'Провал',
      'Низький тиск води',
      'Відсутність Води',
      'Брудна вода',
      'Закупорка',
      'Витік на каналізації',
      'Відкритий колодязь',
      'Пошкоджена кришка колодязя',
      'Несправність засувки',
      'Планові роботи',
      'Встановлення лічильника',
      'Благоустрій',
      'Заміна трубопроводу'
    ] as const,
    TICKET_TYPES: [
      'Аварійні роботи',
      'Планові роботи',
      'Благоустрій'
    ] as const
  },
  FIELD_LABELS: {
    appealType: 'Тип звернення',
    ticketType: 'Тип заявки',
    addressText: 'Текст адреси',
    coordinates: 'Координати',
    notes: 'Примітки'
  } as const
} as const;
