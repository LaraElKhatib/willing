import config from '../../config.ts';

export interface LocationIQSearchEntry {
  place_id: string;
  licence: string;
  lat: string;
  lon: string;
  display_name: string;
  boundingbox: string[];
  importance: number;
}

export type LocationIQSearchResponse = LocationIQSearchEntry[];

export type GeocodingResponseEntry = {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
};

export type GeocodingResponse = GeocodingResponseEntry[];

const queryLocationIQ = async (query: string) => {
  if (!config.LOCATION_IQ_API_KEY) return [];

  const params = new URLSearchParams();
  params.append('q', query);
  params.append('format', 'json');
  params.append('limit', '5');
  params.append('countrycodes', 'lb');
  params.append('key', config.LOCATION_IQ_API_KEY || '');

  const url = 'https://eu1.locationiq.com/v1/search?' + params.toString();

  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }
  const json: LocationIQSearchResponse = await response.json();

  const addresses: GeocodingResponse = json.map((a) => {
    const [name, ...rest] = a.display_name.split(',');
    return {
      name: (name || '').trim(),
      description: rest.join(',').trim(),
      latitude: Number(a.lat),
      longitude: Number(a.lon),
    };
  });

  return addresses;
};

export default queryLocationIQ;
