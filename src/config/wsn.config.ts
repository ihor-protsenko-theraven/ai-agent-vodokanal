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
  PROPERTIES: {
    APPEAL_TYPE: '1958',
    TICKET_TYPE: '1972',
    TICKET_TYPE_SYSTEM_ID: 10197, // System Type ID for "Тип заявки" (works with API)
    APPLICANT_NAME: '1961',
    APPLICANT_ADDRESS: '1960',
    ADDRESS_TEXT: '-389',
    COORDINATES: '-420',
    PHONE_NUMBER: '1981',
    INCIDENT_DATE_TIME: '1258',
    NOTES: '328'
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
    appealType: 'Тип звернення (1958)',
    ticketType: 'Тип заявки (1972)',
    addressText: 'Текст адреси (-389)',
    coordinates: 'Координати (-420)',
    notes: 'Примітки (328)'
  } as const
} as const;
