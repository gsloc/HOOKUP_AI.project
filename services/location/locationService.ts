import { LocationData } from '@/types';

export interface LocationServiceConfig {
  apiKey?: string;
  timeout?: number;
}

// Phase 2: Replace with Google Maps Geocoding API + browser Geolocation API
export async function getCurrentLocation(): Promise<LocationData> {
  await simulateNetworkDelay(300);
  return MOCK_LOCATION;
}

export async function getLocationByCoords(lat: number, lng: number): Promise<LocationData> {
  await simulateNetworkDelay(400);
  return { ...MOCK_LOCATION, lat, lng };
}

export async function searchWaterBodies(query: string): Promise<LocationData[]> {
  await simulateNetworkDelay(500);
  return MOCK_WATER_BODIES.filter((wb) =>
    wb.name.toLowerCase().includes(query.toLowerCase()) ||
    (wb.waterBody?.toLowerCase().includes(query.toLowerCase()) ?? false),
  );
}

export async function getNearbyFishingSpots(lat: number, lng: number, radiusMiles: number = 25): Promise<LocationData[]> {
  await simulateNetworkDelay(600);
  return MOCK_WATER_BODIES.slice(0, 5);
}

function simulateNetworkDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_LOCATION: LocationData = {
  lat: 30.2672,
  lng: -97.7431,
  name: 'Austin, TX',
  state: 'Texas',
  waterBody: 'Lake Travis',
  waterType: 'freshwater',
};

const MOCK_WATER_BODIES: LocationData[] = [
  {
    lat: 30.3887,
    lng: -98.0543,
    name: 'Lake Travis',
    state: 'Texas',
    waterBody: 'Lake Travis',
    waterType: 'freshwater',
  },
  {
    lat: 30.4986,
    lng: -97.8581,
    name: 'Lake Georgetown',
    state: 'Texas',
    waterBody: 'Lake Georgetown',
    waterType: 'freshwater',
  },
  {
    lat: 29.9633,
    lng: -97.8603,
    name: 'Canyon Lake',
    state: 'Texas',
    waterBody: 'Canyon Lake',
    waterType: 'freshwater',
  },
  {
    lat: 30.3352,
    lng: -97.7896,
    name: 'Town Lake (Lady Bird Lake)',
    state: 'Texas',
    waterBody: 'Colorado River',
    waterType: 'freshwater',
  },
];
