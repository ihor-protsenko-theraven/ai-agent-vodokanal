import { SaveResponse } from '../types';

export function isSaveSuccessful(response: SaveResponse | null): boolean {
  if (!response || response.transportStatus == null) {
    return false;
  }

  const transportSucceeded = response.transportStatus >= 200 && response.transportStatus < 300;
  const apiReportedSuccess = response.success !== false && (
    response.HttpStatus == null ||
    (response.HttpStatus >= 200 && response.HttpStatus < 300)
  );

  return transportSucceeded && apiReportedSuccess;
}
