/**
 * Geodata.online (DM Solutions) API types
 */

export interface GeodataAddress {
  ID?: number;
  Id?: number;
  SourceAddress?: string | null;
  AddressString?: string | null;
  Index_?: string | null;
  Region?: string | null;
  Area?: string | null;
  City?: string | null;
  Suburb?: string | null;
  SettlementType?: string | null;
  KOATUU?: string | null;
  PhoneCode?: string | null;
  StreetId?: number | null;
  StrType?: string | null;
  Street?: string | null;
  HouseId?: number | null;
  HouseNum?: string | null;
  HouseNumAdd?: string | null;
  Lat?: string | null;
  Long?: string | null;
  Lat_?: string | null;
  Long_?: string | null;
  Lat_S?: string | null;
  Long_S?: string | null;
  AddressLevel?: string | null;
  CityDistrict?: string | null;
  MetroStation?: string | null;
  MetroLine?: string | null;
  MetroDistance?: string | null;
  KATO?: string | null;
  Hromada?: string | null;
  Distance?: string | null;
  TerrStatus?: string | null;
  Comments?: string | null;
}

/** Results returned by GET /api/Cities. */
export interface GeodataCity {
  st_moniker?: string | null;
  City?: string | null;
  Region?: string | null;
  Area?: string | null;
  SettlementType?: string | null;
  Lat?: string | null;
  Long?: string | null;
}

/** Results returned by GET /api/Streets for a selected city moniker. */
export interface GeodataStreet {
  house_moniker?: string | null;
  Street?: string | null;
  StrType?: string | null;
  City?: string | null;
}

/** Results returned by GET /api/Houses for a selected street moniker. */
export interface GeodataHouse {
  HouseNum?: string | null;
  HouseNumAdd?: string | null;
  AddressString?: string | null;
  Lat?: string | null;
  Long?: string | null;
  Lat_?: string | null;
  Long_?: string | null;
}
