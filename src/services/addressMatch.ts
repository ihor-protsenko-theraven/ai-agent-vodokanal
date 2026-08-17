const ADDRESS_PREFIX_PATTERN = /\b(?:вул(?:иця)?|ул(?:ица)?|просп(?:ект)?|пров(?:улок)?|пл(?:оща)?)\.?\s*/giu;

function getAddressTokens(value: string): string[] {
  return value
    .toLocaleLowerCase('uk-UA')
    .replace(ADDRESS_PREFIX_PATTERN, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => /\d/u.test(token) || token.length >= 4);
}

/**
 * Conservatively compares a reported address with text returned by GetList.
 * GetList currently exposes titles rather than address properties, so a match
 * requires both a house number and a meaningful street token whenever a house
 * number is known. This intentionally favors false negatives over false alerts.
 */
export function isLikelyAddressMatch(address: string, candidate: string): boolean {
  const addressTokens = getAddressTokens(address);
  const candidateTokens = new Set(getAddressTokens(candidate));

  const houseNumbers = addressTokens.filter((token) => /\d/u.test(token));
  const streetTokens = addressTokens.filter((token) => !/\d/u.test(token));
  const matchingStreetTokens = streetTokens.filter((token) => candidateTokens.has(token));

  if (houseNumbers.length > 0) {
    return houseNumbers.every((number) => candidateTokens.has(number)) && matchingStreetTokens.length >= 1;
  }

  return streetTokens.length >= 2 && matchingStreetTokens.length >= 2;
}
