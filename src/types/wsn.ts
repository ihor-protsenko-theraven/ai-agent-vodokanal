/**
 * WSN submission payload types
 */

export interface WsnSubmitPayload {
  wsnClassId: number;
  wsnStatusId: number;
  statusName: string;
  operatorId: string;
  serviceAccount: string;
  callId: string;
  properties: Record<string, string | Date | undefined>;
  confirmedAt: string;
}
