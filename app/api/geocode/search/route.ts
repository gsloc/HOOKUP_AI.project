import { NextRequest, NextResponse } from 'next/server';

interface GeocodeResult {
  latitude: number;
  longitude: number;
  name: string;
  state?: string;
  country?: string;
}

/**
 * Forward geocoding endpoint. Called by services/location/locationService.ts
 * via getLocationByPlaceName().
 *
 * Cascade of strategies:
 *   1. Open-Meteo with the query as provided (handles ZIP codes, well-known
 *      cities). Original behavior.
 *   2. Open-Meteo with any trailing ", <suffix>" clause stripped. Open-Meteo's
 *      search doesn't understand "Wrightsville Beach, NC" — it needs bare
 *      names — so we retry with just the leading component.
 *   3. Nominatim (OpenStreetMap) with the ORIGINAL query. Nominatim has much
 *      broader coverage of small towns, beaches, and landmarks, and it handles
 *      state suffixes correctly, so we hand it the original disambiguated
 *      string, not the stripped version.
 *   4. 404. Client's LocationEntry.tsx renders "Couldn't find that location".
 *
 * All strategies are server-side. Nominatim in particular requires a
 * User-Agent identifying the app; direct browser calls would also hit CORS.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const name = req.nextUrl.searchParams.get('name');

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Missing name parameter' }, { status: 400 });
  }

  const original = name.trim();

  try {
    // ── Strategy 1: as-provided → Open-Meteo ────────────────────────────
    let result = await queryOpenMeteo(original);
    if (result) return NextResponse.json(result);

    // ── Strategy 2: strip trailing ", X" suffix → Open-Meteo ────────────
    // The suffix regex intentionally strips any single trailing clause. That
    // covers ", NC" and ", North Carolina" and ", USA" without needing an
    // explicit allowlist of state names.
    const stripped = original.replace(/,\s*[^,]+$/u, '').trim();
    if (stripped && stripped !== original) {
      result = await queryOpenMeteo(stripped);
      if (result) return NextResponse.json(result);
    }

    // ── Strategy 3: Nominatim (OpenStreetMap) → original query ──────────
    result = await queryNominatim(original);
    if (result) return NextResponse.json(result);

    // ── Strategy 4: give up ────────────────────────────────────────────
    return NextResponse.json({ error: 'No results' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ─── Open-Meteo ──────────────────────────────────────────────────────────

async function queryOpenMeteo(query: string): Promise<GeocodeResult | null> {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`,
  );
  if (!response.ok) return null;

  const data = await response.json();
  const first = data.results?.[0];
  if (!first) return null;

  return {
    latitude: first.latitude,
    longitude: first.longitude,
    name: first.name,
    state: first.admin1,
    country: first.country,
  };
}

// ─── Nominatim (OpenStreetMap) ───────────────────────────────────────────

async function queryNominatim(query: string): Promise<GeocodeResult | null> {
  // addressdetails=1 makes Nominatim return a structured `address` object with
  // proper `state` and `country` fields. Without it we'd have to guess by
  // string-splitting display_name, which returns "X County" instead of the
  // state for many US places.
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;

  const response = await fetch(url, {
    headers: {
      // Nominatim's usage policy requires a real User-Agent identifying the app.
      'User-Agent': 'HOOKUP-AI/1.0 (github.com/gsloc/HOOKUP_AI.project)',
    },
  });
  if (!response.ok) return null;

  const results = await response.json();
  const first = Array.isArray(results) ? results[0] : null;
  if (!first) return null;

  const latitude = parseFloat(first.lat);
  const longitude = parseFloat(first.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  // Prefer the structured address fields (accurate). Fall back to parsing
  // display_name only if the structured fields are missing.
  const displayName: string = typeof first.display_name === 'string' ? first.display_name : '';
  const displayParts = displayName.split(',').map((s) => s.trim()).filter(Boolean);

  const name =
    first.address?.city ||
    first.address?.town ||
    first.address?.village ||
    first.address?.hamlet ||
    first.address?.suburb ||
    first.address?.municipality ||
    displayParts[0] ||
    query;

  const state = first.address?.state || displayParts[1] || undefined;
  const country = first.address?.country || undefined;

  return { latitude, longitude, name, state, country };
}
