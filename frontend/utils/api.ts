import { CompareResponse, ProgressEvent, CityItem, LocationResult } from './constants';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export async function searchProducts(query: string, pincode: string, location: string = ''): Promise<CompareResponse> {
  const response = await fetch(`${BACKEND_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, pincode, location }),
  });
  if (!response.ok) throw new Error('Search failed');
  return response.json();
}

export function streamSearch(
  query: string,
  pincode: string,
  location: string,
  onProgress: (event: ProgressEvent) => void,
  onComplete: (data: CompareResponse) => void,
  onError: (error: string) => void
) {
  const url = `${BACKEND_URL}/api/search/stream?query=${encodeURIComponent(query)}&pincode=${encodeURIComponent(pincode)}&location=${encodeURIComponent(location)}`;

  let aborted = false;

  const fetchStream = async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Stream failed');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        if (aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.type === 'progress') {
                onProgress(parsed);
              } else if (parsed.type === 'result') {
                onComplete(parsed.data);
              } else if (parsed.type === 'done') {
                // Stream complete
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (err: any) {
      if (!aborted) {
        onError(err.message || 'Stream error');
      }
    }
  };

  fetchStream();

  return () => {
    aborted = true;
  };
}

export async function geocodeLocation(lat: number, lng: number) {
  const response = await fetch(`${BACKEND_URL}/api/geocode?lat=${lat}&lng=${lng}`);
  if (!response.ok) throw new Error('Geocode failed');
  return response.json();
}

export async function searchLocations(query: string): Promise<LocationResult[]> {
  const response = await fetch(`${BACKEND_URL}/api/location-search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Location search failed');
  const data = await response.json();
  return data.results || [];
}

export async function getCities(query: string = ''): Promise<CityItem[]> {
  const response = await fetch(`${BACKEND_URL}/api/cities?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Cities fetch failed');
  const data = await response.json();
  return data.cities || [];
}

export async function resolvePincode(pincode: string) {
  const response = await fetch(`${BACKEND_URL}/api/resolve-pincode?pincode=${encodeURIComponent(pincode)}`);
  if (!response.ok) throw new Error('Resolve failed');
  return response.json();
}

export async function saveRecentSearch(query: string, pincode: string, location: string = '') {
  try {
    await fetch(`${BACKEND_URL}/api/recent-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, pincode, location }),
    });
  } catch (_) {
    // Silent fail — analytics only
  }
}
