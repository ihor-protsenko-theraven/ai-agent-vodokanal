import { describe, expect, it } from 'vitest';
import { wsnConfig } from '@/shared/config';
import { formatForlandDateTimeMinutePrecision, formatForlandDateTimeMinutePrecisionWithTimezone } from '@/shared/utils/wsn';
import { buildTicketSaveRequest } from '@/features/forland/application/buildTicketSaveRequest';

describe('buildTicketSaveRequest', () => {
  it('maps form fields, preserves template properties, and keeps the incident date selected by the operator', () => {
    const incidentDate = new Date(2026, 7, 17, 23, 45);
    const now = new Date(2026, 7, 18, 0, 11);
    const request = buildTicketSaveRequest({
      template: {
        ID: -26,
        MetaID: 27772,
        LogID: '639225979145900000',
        Init: {
          StateID: 5041,
          Properties: {
            [wsnConfig.PROPERTIES.INIT_FIELD_1268]: ['initial value']
          }
        },
        Edit: {
          Properties: {
            [wsnConfig.PROPERTIES.AUTOFILL_FIELD]: 'autofill',
            [wsnConfig.PROPERTIES.SYSTEM_FIELD_1265]: 11996
          }
        }
      },
      formData: {
        appealType: 'Витік води',
        ticketType: 'Аварійні роботи',
        applicantName: 'Антон',
        applicantAddress: 'Київ',
        addressText: 'Київ, вул. Хрещатик, 22',
        coordinates: '50.4498465, 30.5230925',
        phoneNumber: '+380501112233',
        incidentDateTime: incidentDate,
        notes: 'Витік біля будинку'
      },
      appealTypeId: 12001,
      ticketTypeId: 12002,
      now
    });

    const unit = request.units[0];
    const properties = unit.Edit?.Properties ?? {};

    expect(unit).toMatchObject({ ID: -26, MetaID: 27772, LogID: '639225979145900000' });
    expect(properties).toMatchObject({
      [wsnConfig.PROPERTIES.APPEAL_TYPE]: 12001,
      [wsnConfig.PROPERTIES.TICKET_TYPE]: 12002,
      [wsnConfig.PROPERTIES.AUTOFILL_FIELD]: 'autofill',
      [wsnConfig.PROPERTIES.SYSTEM_FIELD_1265]: 11996,
      [wsnConfig.PROPERTIES.INCIDENT_DATE_TIME]: formatForlandDateTimeMinutePrecision(incidentDate),
      [wsnConfig.PROPERTIES.DOCUMENT_DATE]: formatForlandDateTimeMinutePrecisionWithTimezone(now),
      [wsnConfig.PROPERTIES.COORDINATES]: {
        wkt: 'POINT(30.5230925 50.4498465)',
        center: null,
        needProcessing: true,
        z: null
      },
      [wsnConfig.PROPERTIES.INIT_FIELD_1268]: ['initial value'],
      [wsnConfig.PROPERTIES.INIT_FIELD_1954]: [],
      [wsnConfig.PROPERTIES.INIT_FIELD_1974]: [],
      [wsnConfig.PROPERTIES.INIT_FIELD_221]: []
    });
  });

  it('falls back to the configured new-unit ID and leaves unparseable coordinates untouched', () => {
    const request = buildTicketSaveRequest({
      template: {},
      formData: {
        appealType: 'Витік води',
        ticketType: 'Аварійні роботи',
        addressText: 'Київ',
        coordinates: 'координати відсутні',
        phoneNumber: '',
        incidentDateTime: 'invalid date',
        notes: 'Тест'
      },
      now: new Date(2026, 7, 18, 0, 11)
    });

    const properties = request.units[0].Edit?.Properties ?? {};
    expect(request.units[0].ID).toBe(wsnConfig.NEW_UNIT_FALLBACK_ID);
    expect(properties[wsnConfig.PROPERTIES.COORDINATES]).toBe('координати відсутні');
  });
});
