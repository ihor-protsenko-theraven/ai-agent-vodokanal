/**
 * Authentication & Security Constants
 */
export const authConfig = {
  STORAGE_KEY: 'wsn_auth',
  DEFAULT_ADMIN_USER: 'admin',
  DEFAULT_ADMIN_PASS: 'admin',
  DEFAULT_OPERATOR_USER: 'operator',
  ADMIN_DISPLAY_NAME: 'Адміністратор Диспетчерської',
  ADMIN_ROLE: 'Головний Диспетчер WSN',
  OPERATOR_DISPLAY_NAME: 'Диспетчер-Оператор',
  OPERATOR_ROLE: 'Оператор АРМ 27772'
} as const;
