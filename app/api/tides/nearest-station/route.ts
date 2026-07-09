import { NextRequest, NextResponse } from 'next/server';

interface NoaaStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface NearestStationResponse {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMiles: number;
}

/**
 * Returns the nearest NOAA tide-prediction station to the requested (lat, lng).
 *
 * NOAA has no "find nearest" endpoint, so we fetch the full station list
 * (~3000 stations, ~500KB) and compute haversine distances server-side. The
 * upstream fetch is cached for 24 hours via Next's data cache since the
 * station list is effectively static.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const latitude  = req.nextUrl.searchParams.get('latitude');
  const longitude = req.nextUrl.searchParams.get('longitude');

  if (!latitude || !longitude) {
    return NextResponse.json({ error: 'Missing latitude or longitude' }, { status: 400 });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'Invalid latitude or longitude' }, { status: 400 });
  }

  try {
    const stationsRes = await fetch(
      'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions',
      { next: { revalidate: 86400 } },
    );

    if (!stationsRes.ok) {
      return NextResponse.json({ error: 'Tide station service unavailable' }, { status: 502 });
    }

    const data = await stationsRes.json();
    const stations: NoaaStation[] = Array.isArray(data.stations) ? data.stations : [];

    if (stations.length === 0) {
      return NextResponse.json({ error: 'Could not find nearby tide station' }, { status: 502 });
    }

    let nearest: NoaaStation | null = null;
    let nearestDistance = Infinity;

    for (const s of stations) {
      if (typeof s.lat !== 'number' || typeof s.lng !== 'number') continue;
      const d = haversineDistanceMiles(lat, lng, s.lat, s.lng);
      if (d < nearestDistance) {
        nearest = s;
        nearestDistance = d;
      }
    }

    if (!nearest) {
      return NextResponse.json({ error: 'Could not find nearby tide station' }, { status: 502 });
    }

    const response: NearestStationResponse = {
      id: nearest.id,
      name: nearest.name,
      lat: nearest.lat,
      lng: nearest.lng,
      distanceMiles: Number(nearestDistance.toFixed(2)),
    };
    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function haversineDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 3959; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
