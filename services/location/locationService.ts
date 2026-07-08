import { LocationData } from '@/types';

export interface LocationServiceConfig {
  apiKey?: string;
  timeout?: number;
}

// ─── Error types ─────────────────────────────────────────────────────────────

export class LocationPermissionError extends Error {
  constructor(message = 'Location permission denied or unavailable') {
    super(message);
    this.name = 'LocationPermissionError';
  }
}

export class LocationNotFoundError extends Error {
  constructor(message = 'Could not find that location') {
    super(message);
    this.name = 'LocationNotFoundError';
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'hookup_location';
// Open-Meteo blocks browser origins on /reverse due to CORS. All geocoding
// calls are proxied through Next.js API routes at /api/geocode/*.
const GEO_MAX_AGE_MS = 300_000;

// PositionError.code values (from the W3C Geolocation API).
// See: https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError
const PERMISSION_DENIED = 1;
// const POSITION_UNAVAILABLE = 2;   // treated the same as TIMEOUT for our chain
// const TIMEOUT = 3;

/** True iff err looks like the browser denied us (code === 1). */
function isPermissionDenied(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as GeolocationPositionError).code === PERMISSION_DENIED
  );
}

interface GeocodeResponse {
  latitude?: number;
  longitude?: number;
  name?: string;
  state?: string;
  country?: string;
}

interface IpGeolocateResponse {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
}

// ─── getCurrentLocation ──────────────────────────────────────────────────────

/**
 * Client-side location resolution with a 3-strategy fallback chain.
 *
 * Order of attempts:
 *   0. sessionStorage cache (avoids re-prompting mid-session).
 *
 *   1. Browser geolocation, HIGH accuracy, 8s timeout, maximumAge 300s.
 *      Fast on macOS via CoreLocation; also usually gives sub-100m precision.
 *
 *   2. Browser geolocation, LOW accuracy, 12s timeout, maximumAge 300s.
 *      Reached only if Strategy 1 failed with POSITION_UNAVAILABLE / TIMEOUT
 *      (code 2 or 3). If Strategy 1 failed with PERMISSION_DENIED (code 1),
 *      the user has actively declined — we respect that and skip the rest.
 *
 *   3. Server-side IP geolocation via /api/geolocate-ip.
 *      Reached only if Strategy 2 also failed with a non-denial error, or
 *      both browser strategies were denied at OS/system level (not user).
 *
 * Precision:
 *   - Strategies 1 & 2 → precise: true
 *   - Strategy 3       → precise: false (triggers the ManualLocationBanner)
 *
 * Throws LocationPermissionError only if:
 *   - The user actively denied at either browser strategy (code 1), OR
 *   - All three strategies (including IP fallback) failed to yield coordinates.
 * The chat page catches this and renders manual-entry UI.
 *
 * Note: This function is browser-only. On the server it will throw immediately
 * with LocationPermissionError because navigator/sessionStorage are undefined.
 */
export async function getCurrentLocation(): Promise<LocationData> {
  // 0. sessionStorage cache — validate before returning to purge bad entries
  //    from earlier CORS-failure runs that cached a fallback "Current location".
  const cached = readCachedLocation();
  if (cached && isValidCachedLocation(cached)) {
    return cached;
  }
  if (cached && !isValidCachedLocation(cached)) {
    clearCachedLocation();
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new LocationPermissionError('Geolocation is not available in this environment');
  }

  // ── Strategy 1: high-accuracy browser geolocation (fast on macOS) ─────
  let coords: { latitude: number; longitude: number } | null = null;
  let precise = true;
  let ipFallback: IpGeolocateResponse | null = null;

  try {
    const position = await tryBrowserGeolocation(true, 8_000);
    coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch (err1) {
    if (isPermissionDenied(err1)) {
      // User actively said No. Respect it — do not fall through.
      throw new LocationPermissionError('Location permission denied');
    }

    // ── Strategy 2: low-accuracy browser geolocation (slower but broader) ─
    try {
      const position = await tryBrowserGeolocation(false, 12_000);
      coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    } catch (err2) {
      if (isPermissionDenied(err2)) {
        throw new LocationPermissionError('Location permission denied');
      }

      // ── Strategy 3: server-side IP-based fallback ─────────────────────
      ipFallback = await tryIpFallback();
      if (!ipFallback) {
        throw new LocationPermissionError('All location strategies failed');
      }
      coords = { latitude: ipFallback.latitude, longitude: ipFallback.longitude };
      precise = false;
    }
  }

  // Reverse-geocode via our server-side proxy (bypasses Open-Meteo CORS).
  const reversed = await reverseGeocode(coords.latitude, coords.longitude);

  // If reverse-geocode succeeded, use its name/state. If it didn't but we came
  // from the IP fallback, use ipapi's city/region directly — better UX than
  // dropping to manual entry when we already have a usable friendly name.
  let name: string | undefined;
  let state: string | undefined;
  if (reversed?.name) {
    name = reversed.name;
    state = reversed.state;
  } else if (ipFallback) {
    name = ipFallback.city;
    state = ipFallback.region;
  }

  if (!name) {
    throw new LocationPermissionError('Reverse geocoding returned no place name');
  }

  const location: LocationData = {
    lat: coords.latitude,
    lng: coords.longitude,
    name,
    state,
    precise,
  };

  writeCachedLocation(location);
  return location;
}

// ─── Strategy helpers ────────────────────────────────────────────────────────

/** Wrap navigator.geolocation.getCurrentPosition in a Promise. */
function tryBrowserGeolocation(highAccuracy: boolean, timeoutMs: number): Promise<GeolocationPosition> {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: highAccuracy,
      timeout: timeoutMs,
      maximumAge: GEO_MAX_AGE_MS,
    });
  });
}

/** Call /api/geolocate-ip. Returns null on any error — caller treats null as "no fallback". */
async function tryIpFallback(): Promise<IpGeolocateResponse | null> {
  try {
    const res = await fetch('/api/geolocate-ip');
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return null;
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      city: typeof data.city === 'string' ? data.city : undefined,
      region: typeof data.region === 'string' ? data.region : undefined,
    };
  } catch {
    return null;
  }
}

/** Call /api/geocode/reverse. Returns null on any failure (caller handles the fallback). */
async function reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResponse | null> {
  try {
    const res = await fetch(`/api/geocode/reverse?latitude=${latitude}&longitude=${longitude}`);
    if (!res.ok) return null;
    return (await res.json()) as GeocodeResponse;
  } catch {
    return null;
  }
}

// ─── getLocationByPlaceName ──────────────────────────────────────────────────

/**
 * Forward-geocode a user-entered place name or zip code via Open-Meteo search.
 * Used by the manual-entry UI when browser geolocation is denied or unavailable.
 *
 * Throws LocationNotFoundError when the query yields no results.
 */
export async function getLocationByPlaceName(query: string): Promise<LocationData> {
  const res = await fetch(`/api/geocode/search?name=${encodeURIComponent(query)}`);

  if (res.status === 404) {
    throw new LocationNotFoundError();
  }
  if (!res.ok) {
    throw new LocationNotFoundError('Geocoding service is unavailable');
  }

  const data: GeocodeResponse = await res.json();

  if (data.latitude === undefined || data.longitude === undefined || !data.name) {
    throw new LocationNotFoundError();
  }

  const location: LocationData = {
    lat: data.latitude,
    lng: data.longitude,
    name: data.name,
    state: data.state,
    precise: false,
  };

  writeCachedLocation(location);
  return location;
}

// ─── sessionStorage helpers ──────────────────────────────────────────────────

function readCachedLocation(): LocationData | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocationData;
    if (typeof parsed.lat !== 'number' || typeof parsed.lng !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedLocation(loc: LocationData): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  } catch {
    // Storage quota / private mode — non-fatal
  }
}

function clearCachedLocation(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-fatal
  }
}

/**
 * Reject legacy cached locations that stored the fallback placeholder name
 * "Current Location" / "Current location" (written by a prior CORS-broken
 * version of getCurrentLocation) or lack a real name entirely.
 */
function isValidCachedLocation(loc: LocationData): boolean {
  if (!loc.name || !loc.name.trim()) return false;
  const normalized = loc.name.trim().toLowerCase();
  if (normalized === 'current location') return false;
  return true;
}

// ─── Untouched: legacy mock helpers (kept for future features) ───────────────

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
