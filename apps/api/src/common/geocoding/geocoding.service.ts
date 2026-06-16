import { Injectable, Logger } from '@nestjs/common';

export interface GeocodeAddressInput {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'PetDots/1.0 (contato@petdots.com.br)';

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  async geocodeAddress(input: GeocodeAddressInput): Promise<GeocodeResult | null> {
    const query = `${input.street}, ${input.number}, ${input.neighborhood}, ${input.city}, ${input.state}, ${input.zipCode}, Brazil`;
    const url = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      });

      if (!response.ok) {
        this.logger.warn(`Geocoding request failed with status ${response.status}`);
        return null;
      }

      const results = (await response.json()) as Array<{ lat: string; lon: string }>;
      const first = results[0];
      if (!first) {
        return null;
      }

      return { latitude: Number(first.lat), longitude: Number(first.lon) };
    } catch (error) {
      this.logger.warn(`Geocoding request errored: ${error}`);
      return null;
    }
  }
}
