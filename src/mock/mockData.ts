import { AgentProcessingResult, ScenarioDefinition } from '../types/ticket';
import { aiConfig } from '../config';

/**
 * Сценарій 1: Чітко сформовано (Висока впевненість)
 * Заявник надав повну інформацію, всі коефіцієнти > 90%, готово до реєстрації в 1 клік.
 */
export const SCENARIO_HIGH_CONFIDENCE: AgentProcessingResult = {
  callId: 'CALL-20260724-1109',
  transcript: `[00:01] AI-Агент: Аварійно-диспетчерська служба Водоканалу. Вітаю!
[00:04] Заявник (Павло Сергійович): Доброго дня! У нас аварійна ситуація на проспекті Берестейському (Перемоги), будинок 88. Кришка колодязя повністю зсунута, відкрита яма прямо на тротуарі!
[00:11] AI-Агент: Заявку прийнято. Небезпечна ділянка біля будинку 88 по просп. Берестейському. Направляю бригаду для встановлення огородження.
[00:18] Заявник: Мій телефон +380638887766, Павло. Дякую!`,
  ticket: {
    appealType: 'Відкритий колодязь',
    ticketType: 'Благоустрій',
    applicantName: 'Павло Сергійович',
    applicantAddress: 'просп. Берестейський, 88, кв. 12',
    addressText: 'просп. Берестейський, 88 (на тротуарі)',
    coordinates: '50.4578, 30.4123',
    phoneNumber: '+380638887766',
    incidentDateTime: new Date().toISOString().slice(0, 16),
    notes: 'Зсунута кришка оглядового колодязя на тротуарі біля просп. Берестейський, 88. Відкрита яма, загроза травмування пішоходів.'
  },
  confidence: {
    speechRecognition: 0.98,
    classification: 0.96,
    addressExtraction: 0.97,
    geocoding: 0.95
  },
  requiresManualReview: false,
  suggestedQuestions: [
    'Чи огороджена небезпечна зона?',
    'Чи належить колодязь до мережі водопостачання?'
  ],
  duplicatesFound: [],
  requiresTicketRegistration: true
};

/**
 * Сценарій 2: Показуємо дублювання (Виявлено існуючі заявки у WSN)
 * Автоматичний збіг за адресою Хрещатик 15, виводиться Alert-банер та порівняльне модальне вікно.
 */
export const SCENARIO_DUPLICATE_FOUND: AgentProcessingResult = {
  callId: 'CALL-20260724-9102',
  transcript: `[00:01] AI-Агент: Аварійна служба Водоканалу, слухаю вас.
[00:04] Заявник (Марія Сергіївна): Знову телефоную щодо витоку на Хрещатику 15! Воду у подвірʼї так і не перекрили!
[00:10] AI-Агент: Фіксую ваше звернення. За цією адресою вже зареєстровано активний аварійний виклик.`,
  ticket: {
    appealType: 'Витік води',
    ticketType: 'Аварійні роботи',
    applicantName: 'Марія Сергіївна',
    applicantAddress: 'вул. Хрещатик, 15, кв. 4',
    addressText: 'вул. Хрещатик, 15',
    coordinates: '50.4471, 30.5218',
    phoneNumber: '+380509876543',
    incidentDateTime: new Date().toISOString().slice(0, 16),
    notes: 'Повторний дзвінок про порив водопроводу на Хрещатику 15. Заявник скаржиться на відсутність бригади.'
  },
  confidence: {
    speechRecognition: 0.95,
    classification: 0.98,
    addressExtraction: 0.96,
    geocoding: 0.92
  },
  requiresManualReview: false,
  suggestedQuestions: [
    'Уточнити час першого звернення або номер існуючої заявки.',
    'Повідомити оператора про статус виїзду аварійної бригади №4.'
  ],
  duplicatesFound: [
    {
      ticketId: 'WSN-27772-5996-0812',
      matchReason: 'ADDRESS_MATCH',
      createdDate: '2026-07-24 21:30',
      status: '5996 (На виконання)',
      addressText: 'вул. Хрещатик, 15',
      appealType: 'Витік води'
    },
    {
      ticketId: 'WSN-27772-5041-0799',
      matchReason: 'COORDINATES_MATCH',
      createdDate: '2026-07-24 20:15',
      status: '5041 (В обробці)',
      addressText: 'вул. Хрещатик, 15 (подвірʼя)',
      appealType: 'Витік води'
    }
  ],
  requiresTicketRegistration: true
};

/**
 * Сценарій 3: Багато що уточнити та валідувати оператору (Низька впевненість)
 * Адреса розмита, низькі коефіцієнти розпізнавання (< 70%), вимагає обов'язкових чекбоксів перевірки.
 */
export const SCENARIO_LOW_CONFIDENCE: AgentProcessingResult = {
  callId: 'CALL-20260724-8841',
  transcript: `[00:01] AI-Агент: Доброго дня! Водоканал України, служба підтримки. Опишіть, будь ласка, вашу проблему.
[00:05] Заявник (Іван Коваленко): Алло, вітаю! У нас на вулиці Шевченка біля будинку 42 з-під люка тече вода річкою!
[00:12] AI-Агент: Зрозуміло. Уточніть, будь ласка, чи вода чиста питна, чи є запах каналізації?
[00:17] Заявник: Ні, чиста холодна вода, але натиск дуже сильний, вже підтоплює тротуар.
[00:24] AI-Агент: Дякую за уточнення. Потрібно перевірити координати та орієнтири для виїзду аварійної бригади.
[00:31] Заявник: Це прямо біля магазину "Квіти", орієнтовно Шевченка, 42A.`,
  ticket: {
    appealType: 'Витік води',
    ticketType: 'Аварійні роботи',
    applicantName: 'Коваленко Іван Петрович',
    applicantAddress: 'вул. Тараса Шевченка, 42, кв. 15',
    addressText: 'вул. Тараса Шевченка, 42A (біля маг. Квіти)',
    coordinates: '50.4501, 30.5234',
    phoneNumber: '+380671234567',
    incidentDateTime: new Date().toISOString().slice(0, 16),
    notes: 'Витік чистої питної води з-під оглядового колодязя біля магазину Квіти. Підтоплення тротуару.'
  },
  confidence: {
    speechRecognition: 0.88,
    classification: 0.92,
    addressExtraction: 0.62, // LOW (< 0.7) - triggers review
    geocoding: 0.54          // LOW (< 0.7) - triggers review
  },
  requiresManualReview: true,
  suggestedQuestions: [
    'Чи є загроза підтоплення підвалу житлового будинку?',
    'Уточніть чи перекрито проїжджу частину дороги?',
    'Чи спостерігається зниження тиску у сусідніх будинках?'
  ],
  duplicatesFound: [],
  requiresTicketRegistration: true
};

/**
 * Сценарій 4: Консультація / Тарифи (Заявка не потрібна)
 */
export const SCENARIO_NO_REGISTRATION: AgentProcessingResult = {
  callId: 'CALL-20260724-4410',
  transcript: `[00:01] AI-Агент: Вітаємо у Водоканалі. Чим можу допомогти?
[00:05] Заявник: Доброго дня, підкажіть, будь ласка, який зараз тариф на холодне водопостачання для фізичних осіб?
[00:11] AI-Агент: Поточний тариф становить 30,38 грн за 1 куб. м. Чи є у вас інші питання?
[00:18] Заявник: Ні, дякую, це все що хотіла дізнатися.`,
  ticket: {
    appealType: 'Консультація / Тарифи',
    ticketType: 'Планові роботи',
    applicantName: 'Олена Анатоліївна',
    applicantAddress: '',
    addressText: 'м. Київ (без конкретної адреси)',
    coordinates: '',
    phoneNumber: '+380931112233',
    incidentDateTime: new Date().toISOString().slice(0, 16),
    notes: 'Інформаційний запит щодо тарифів на водопостачання. Консультацію надано в автоматичному режимі.'
  },
  confidence: {
    speechRecognition: 0.99,
    classification: 0.99,
    addressExtraction: 0.40,
    geocoding: 0.30
  },
  requiresManualReview: false,
  suggestedQuestions: [
    'Запропонувати передачу показників лічильника через чат-бот.',
    'Надати номер довідкової служби.'
  ],
  duplicatesFound: [],
  requiresTicketRegistration: false
};

export const MOCK_SCENARIOS: ScenarioDefinition[] = [
  {
    id: aiConfig.SCENARIOS.HIGH_CONFIDENCE,
    name: '1. Чітко сформовано (Висока впевненість)',
    description: 'Усі дані чіткі, впевненість > 95%. Готово до реєстрації в 1 клік.',
    data: SCENARIO_HIGH_CONFIDENCE
  },
  {
    id: aiConfig.SCENARIOS.DUPLICATES_FOUND,
    name: '2. Виявлено дублювання у WSN',
    description: 'Знайдено існуючі активні заявки WSN Class 27772. Виводиться Alert-банер.',
    data: SCENARIO_DUPLICATE_FOUND
  },
  {
    id: aiConfig.SCENARIOS.LOW_CONFIDENCE,
    name: '3. Потрібно уточнити та валідувати оператору',
    description: 'Адреса та геокодування < 0.7. Вимагає ручної валідації чекбоксами.',
    data: SCENARIO_LOW_CONFIDENCE
  },
  {
    id: aiConfig.SCENARIOS.NO_REGISTRATION,
    name: '4. Не потребує реєстрації (Консультація)',
    description: 'requiresTicketRegistration === false. Заблокована форма з кнопкою примусового створення.',
    data: SCENARIO_NO_REGISTRATION
  }
];
