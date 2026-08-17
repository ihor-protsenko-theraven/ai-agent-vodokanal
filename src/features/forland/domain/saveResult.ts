import { SavedUnit, SaveResponse } from '@/shared/types';

export function isSaveSuccessful(response: SaveResponse | null): boolean {
  if (!response || response.transportStatus == null) {
    return false;
  }

  const transportSucceeded = response.transportStatus >= 200 && response.transportStatus < 300;
  const apiReportedSuccess = response.success !== false && (
    response.HttpStatus == null ||
    (response.HttpStatus >= 200 && response.HttpStatus < 300)
  );
  const hasSavedUnits = response.countSaved == null || response.countSaved > 0;

  return transportSucceeded && apiReportedSuccess && hasSavedUnits;
}

/** Return the unit confirmed by Forland, accepting its older flat response too. */
export function getSavedUnit(response: SaveResponse | null): SavedUnit | null {
  if (!response) return null;

  const unit = response.units?.find((item) => item && typeof item.ID === 'number');
  if (unit) return unit;

  if (typeof response.ID === 'number') {
    return {
      ID: response.ID,
      Title: response.Title
    };
  }

  return null;
}

/** Extract the human-facing number from a standard Forland ticket title. */
export function getTicketNumber(title: string | undefined): string | null {
  const match = title?.match(/заявка\s*№\s*([^\s\[]+)/iu);
  return match?.[1] ?? null;
}
