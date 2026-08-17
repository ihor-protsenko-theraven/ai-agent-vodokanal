import { afterEach, describe, expect, it, vi } from 'vitest';
import { geodataService } from '@/features/geocoding/infrastructure/GeodataService';

describe('Geodata coordinate extraction', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not use settlement-level Lat_S and Long_S as ticket coordinates', () => {
    expect(geodataService.getCoordinatesString({
      AddressString: 'місто Київ, вул. Перемоги, 27',
      Lat_: null,
      Long_: null,
      Lat_S: '50.450412',
      Long_S: '30.523487'
    })).toBeNull();
  });

  it('uses FullAddress directly for exact ticket coordinates', async () => {
    const searchAddress = vi.spyOn(geodataService, 'searchAddress').mockResolvedValue([]);
    vi.spyOn(geodataService, 'getFullAddress').mockResolvedValue({
      ID: 1,
      SourceAddress: 'м Київ вул Саперна слобідська 27',
      Lat: '50.411234',
      Long: '30.519876',
      Lat_S: '50.450412',
      Long_S: '30.523487'
    });

    await expect(geodataService.getCoordinates('м Київ вул Саперна слобідська 27'))
      .resolves.toBe('50.411234, 30.519876');
    expect(geodataService.getFullAddress).toHaveBeenCalledOnce();
    expect(searchAddress).not.toHaveBeenCalled();
  });

  it('returns the FullAddress record and its exact coordinates in one resolution', async () => {
    vi.spyOn(geodataService, 'getFullAddress').mockResolvedValue({
      SourceAddress: 'Мелітополь, вул. Шевченка, 10',
      Lat: '46.851173',
      Long: '35.384931'
    });

    await expect(geodataService.resolveAddress('Мелітополь, вул. Шевченка, 10')).resolves.toMatchObject({
      address: { SourceAddress: 'Мелітополь, вул. Шевченка, 10' },
      coordinates: '46.851173, 35.384931'
    });
  });

  it('uses the Cities → Streets → Houses chain only when FullAddress has no exact point', async () => {
    vi.spyOn(geodataService, 'getFullAddress').mockResolvedValue({
      City: 'Київ',
      Region: 'Київ',
      Street: 'Саперно-Слобідська',
      HouseNum: '27',
      Lat: null,
      Long: null,
      Lat_S: '50.450412',
      Long_S: '30.523487'
    });
    vi.spyOn(geodataService, 'searchCities').mockResolvedValue([{ st_moniker: 'city-kyiv', City: 'Київ' }]);
    vi.spyOn(geodataService, 'searchStreets').mockResolvedValue([{ house_moniker: 'street-27', Street: 'Саперно-Слобідська' }]);
    vi.spyOn(geodataService, 'searchHouses').mockResolvedValue([{ HouseNum: '27', Lat: '50.412345', Long: '30.512345' }]);

    await expect(geodataService.getCoordinates('Київ, вул. Саперно-Слобідська, 27'))
      .resolves.toBe('50.412345, 30.512345');
  });

  it('normalizes a city prefix and does not duplicate the Cyrillic street keyword', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }));

    await geodataService.searchAddress('м. Київ, вул. Велика Китайська, 22');

    expect(fetchMock).toHaveBeenCalledOnce();
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get('sRequest')).toBe('Київ вул Велика Китайська 22');
  });
});
