import { wsnConfig } from '@/shared/config';
import { CreateNewUnitResponse, SaveRequest, WsnTicketData } from '@/shared/types';
import {
  formatForlandDateTimeMinutePrecision,
  formatForlandDateTimeMinutePrecisionWithTimezone
} from '@/shared/utils/wsn';

export interface BuildTicketSaveRequestInput {
  template: CreateNewUnitResponse;
  formData: Readonly<WsnTicketData>;
  appealTypeId?: number;
  ticketTypeId?: number;
  now?: Date;
}

/**
 * Converts the editable ticket form into the Forland Save contract.
 *
 * The browser store remains responsible for the workflow (validation, loading
 * the template and invoking the API); this function owns only the deterministic
 * mapping into the external API format.
 */
export function buildTicketSaveRequest({
  template,
  formData,
  appealTypeId,
  ticketTypeId,
  now = new Date()
}: BuildTicketSaveRequestInput): SaveRequest {
  const templateEditProperties = template.Edit?.Properties ?? {};
  const templateInitProperties = template.Init?.Properties ?? {};
  const incidentDate = getValidDate(formData.incidentDateTime, now);

  const properties: Record<string, unknown> = {
    ...templateInitProperties,
    ...templateEditProperties,
    [wsnConfig.PROPERTIES.APPEAL_TYPE]: appealTypeId ?? formData.appealType,
    [wsnConfig.PROPERTIES.TICKET_TYPE]: ticketTypeId ?? formData.ticketType,
    [wsnConfig.PROPERTIES.APPLICANT_NAME]: formData.applicantName,
    [wsnConfig.PROPERTIES.APPLICANT_ADDRESS]: formData.applicantAddress,
    [wsnConfig.PROPERTIES.ADDRESS_TEXT]: formData.addressText,
    [wsnConfig.PROPERTIES.COORDINATES]: toForlandCoordinates(formData.coordinates),
    [wsnConfig.PROPERTIES.PHONE_NUMBER]: formData.phoneNumber,
    [wsnConfig.PROPERTIES.INCIDENT_DATE_TIME]: formatForlandDateTimeMinutePrecision(incidentDate),
    [wsnConfig.PROPERTIES.NOTES]: formData.notes,
    [wsnConfig.PROPERTIES.DOCUMENT_DATE]: formatForlandDateTimeMinutePrecisionWithTimezone(now)
  };

  for (const arrayField of getRequiredInitArrayFields()) {
    properties[arrayField] = templateInitProperties[arrayField] ?? [];
  }

  return {
    units: [{
      ID: template.ID ?? wsnConfig.NEW_UNIT_FALLBACK_ID,
      Title: 'Заявка № [AUTO] (AI-агент)',
      MetaID: wsnConfig.CLASS_ID,
      ...(template.LogID != null ? { LogID: template.LogID } : {}),
      Init: template.Init,
      Edit: {
        Properties: properties,
        StateID: wsnConfig.DEFAULT_STATUS_ID
      }
    }],
    onlyAllSave: true
  };
}

function toForlandCoordinates(coordinates: string): string | Record<string, unknown> {
  const [latitude = '', longitude = '', ...rest] = coordinates.split(',').map((value) => value.trim());
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (
    rest.length === 0
    && latitude.length > 0
    && longitude.length > 0
    && Number.isFinite(lat)
    && Number.isFinite(lon)
  ) {
    return {
      wkt: `POINT(${lon} ${lat})`,
      center: null,
      needProcessing: true,
      z: null
    };
  }

  return coordinates;
}

function getValidDate(value: Date | string, fallback: Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function getRequiredInitArrayFields(): readonly string[] {
  return [
    wsnConfig.PROPERTIES.INIT_FIELD_1268,
    wsnConfig.PROPERTIES.INIT_FIELD_1954,
    wsnConfig.PROPERTIES.INIT_FIELD_1974,
    wsnConfig.PROPERTIES.INIT_FIELD_221
  ];
}
