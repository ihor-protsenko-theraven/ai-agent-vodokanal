import { afterEach, describe, expect, it, vi } from 'vitest';
import { nominatimService } from '@/features/geocoding/infrastructure/NominatimService';

describe('NominatimService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses the current Ukrainian-only search contract and does not duplicate the country', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }));

    await nominatimService.geocode('  Хрещатик, 22, Київ, Україна  ');

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe('/search');
    expect(url.searchParams.get('q')).toBe('Хрещатик, 22, Київ, Україна');
    expect(url.searchParams.get('format')).toBe('jsonv2');
    expect(url.searchParams.get('countrycodes')).toBe('ua');
    expect(url.searchParams.get('accept-language')).toBe('uk');
  });

  it('returns coordinates from a valid Nominatim response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([
      { lat: '50.4498465', lon: '30.5230925' }
    ]), { status: 200 }));

    await expect(nominatimService.geocode('Хрещатик, 22, Київ'))
      .resolves.toBe('50.449847, 30.523093');
  });

  it('returns every valid suggestion, including places at the same address', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([
      { lat: '50.4498465', lon: '30.5230925', display_name: '22, вулиця Хрещатик, Київ', category: 'building', address: { house_number: '22' } },
      { lat: '50.4499153', lon: '30.5231566', display_name: 'Головпоштамт, 22, вулиця Хрещатик, Київ', category: 'amenity', address: { house_number: '22' } }
    ]), { status: 200 }));

    await expect(nominatimService.search('Хрещатик, 22, Київ')).resolves.toEqual([
      expect.objectContaining({ coords: '50.449847, 30.523093' }),
      expect.objectContaining({ coords: '50.449915, 30.523157' })
    ]);
  });
});
