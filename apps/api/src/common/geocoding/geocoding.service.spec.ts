import { GeocodingService } from './geocoding.service';

describe('GeocodingService', () => {
  let service: GeocodingService;
  let fetchMock: jest.Mock;

  const input = {
    street: 'Rua das Flores',
    number: '123',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01001-000',
  };

  beforeEach(() => {
    service = new GeocodingService();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('returns coordinates when the geocoding API finds a result', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '-23.55', lon: '-46.63' }],
    });

    const result = await service.geocodeAddress(input);

    expect(result).toEqual({ latitude: -23.55, longitude: -46.63 });
  });

  it('returns null when the geocoding API returns no results', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const result = await service.geocodeAddress(input);

    expect(result).toBeNull();
  });

  it('returns null when the geocoding API responds with an error status', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });

    const result = await service.geocodeAddress(input);

    expect(result).toBeNull();
  });

  it('returns null without throwing when the request errors', async () => {
    fetchMock.mockRejectedValue(new Error('network error'));

    const result = await service.geocodeAddress(input);

    expect(result).toBeNull();
  });
});
