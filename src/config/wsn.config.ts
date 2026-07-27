/**
 * Water Supply Network (WSN) API and Domain Identifiers
 */
export const wsnConfig = {
  CLASS_ID: 27772,
  DEFAULT_STATUS_ID: 5996,
  DEFAULT_STATUS_NAME: 'На виконання',
  OPERATOR_ID: 'OPERATOR-402',
  OPERATOR_DISPLAY: '#402 (WSN-AUTH)',
  SERVICE_ACCOUNT: 'WSN-AI-AGENT-SERVICE',
  PROPERTIES: {
    APPEAL_TYPE: '1958',
    TICKET_TYPE: '1972',
    APPLICANT_NAME: '1961',
    APPLICANT_ADDRESS: '1960',
    ADDRESS_TEXT: '-389',
    COORDINATES: '-420',
    PHONE_NUMBER: '1981',
    INCIDENT_DATE_TIME: '1258',
    NOTES: '328'
  },
  OPTIONS: {
    APPEAL_TYPES: [
      'Витік холодної води',
      'Порив водопроводу',
      'Відсутнє водопостачання',
      'Пошкодження/відсутність люка',
      'Засмічення каналізації',
      'Консультація / Тарифи',
      'Інше'
    ] as const,
    TICKET_TYPES: [
      'Аварійна',
      'Планова',
      'Інформаційна',
      'Інше'
    ] as const
  }
} as const;
