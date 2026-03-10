import { SearchResponse } from './constants';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export async function searchProducts(query: string, pincode: string): Promise<SearchResponse> {
  const response = await fetch(`${BACKEND_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, pincode }),
  });
  if (!response.ok) throw new Error('Search failed');
  return response.json();
}

export async function geocodeLocation(lat: number, lng: number) {
  const response = await fetch(`${BACKEND_URL}/api/geocode?lat=${lat}&lng=${lng}`);
  if (!response.ok) throw new Error('Geocode failed');
  return response.json();
}

export async function saveRecentSearch(query: string, pincode: string) {
  try {
    await fetch(`${BACKEND_URL}/api/recent-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, pincode }),
    });
  } catch (_) {
    // Silent fail — analytics only
  }
}
