import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side proxy for Open-Meteo current-weather forecast.
 *
 * Client contract (matches WeatherData in types/index.ts):
 *   GET /api/weather/current?latitude={lat}&longitude={lng}
 *   → 200 { temperatureF, windSpeedMph, windDirection, conditions,
 *           pressureInHg, pressureTrend, humidity, cloudCoverPercent, uvIndex }
 *   → 400 { error: 'Missing coordinates' }
 *   → 502 { error: 'Weather service unavailable' }
 *   → 500 { error: 'Invalid weather response' | 'Server error' }
 *
 * We ask Open-Meteo for both the `current` block (single sample) and the next 6
 * hours of `pressure_msl` — the delta between hour 0 and hour 5 is what drives
 * the rising / falling / steady classification the AI uses for its fish-activity
 * predictions.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const latitude = req.nextUrl.searchParams.get('latitude');
  const longitude = req.nextUrl.searchParams.get('longitude');

  if (!latitude || !longitude) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 });
  }

  const upstream =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${encodeURIComponent(latitude)}` +
    `&longitude=${encodeURIComponent(longitude)}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index` +
    `&hourly=pressure_msl` +
    `&forecast_hours=6` +
    `&temperature_unit=fahrenheit` +
    `&wind_speed_unit=mph` +
    `&precipitation_unit=inch` +
    `&timezone=auto`;

  let response: Response;
  try {
    response = await fetch(upstream);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  if (!response.ok) {
    return NextResponse.json({ error: 'Weather service unavailable' }, { status: 502 });
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return NextResponse.json({ error: 'Invalid weather response' }, { status: 500 });
  }

  try {
    const shaped = shapeWeatherResponse(data);
    return NextResponse.json(shaped);
  } catch {
    return NextResponse.json({ error: 'Invalid weather response' }, { status: 500 });
  }
}

// ─── Response shaping ────────────────────────────────────────────────────────

interface OpenMeteoCurrent {
  temperature_2m: number;
  relative_humidity_2m: number;
  is_day: number;
  precipitation: number;
  cloud_cover: number;
  pressure_msl: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  uv_index: number;
}

interface OpenMeteoResponse {
  current?: OpenMeteoCurrent;
  hourly?: { pressure_msl?: number[] };
}

interface ShapedWeather {
  temperatureF: number;
  windSpeedMph: number;
  windDirection: string;
  conditions: string;
  pressureInHg: number;
  pressureTrend: 'rising' | 'falling' | 'steady';
  humidity: number;
  cloudCoverPercent: number;
  uvIndex: number;
}

function shapeWeatherResponse(raw: unknown): ShapedWeather {
  const data = raw as OpenMeteoResponse;
  const c = data.current;
  if (!c) throw new Error('missing current block');

  // Required numeric fields — a missing one indicates upstream shape drift.
  const required: Array<keyof OpenMeteoCurrent> = [
    'temperature_2m',
    'relative_humidity_2m',
    'is_day',
    'precipitation',
    'cloud_cover',
    'pressure_msl',
    'wind_speed_10m',
    'wind_direction_10m',
    'uv_index',
  ];
  for (const key of required) {
    if (typeof c[key] !== 'number') throw new Error(`missing field ${key}`);
  }

  // Pressure trend needs at least 6 hourly samples; if the upstream truncated,
  // fall back to 'steady' rather than throwing — steady is a safe non-signal.
  const pressureSeries = data.hourly?.pressure_msl ?? [];
  const p0 = pressureSeries[0] ?? c.pressure_msl;
  const p5 = pressureSeries[5] ?? c.pressure_msl;

  // hPa → inHg. Standard conversion factor: 1 hPa = 0.02953 inHg.
  const HPA_TO_INHG = 0.02953;

  return {
    temperatureF: c.temperature_2m,
    windSpeedMph: c.wind_speed_10m,
    windDirection: degreesToCompass(c.wind_direction_10m),
    conditions: deriveConditions(c.cloud_cover, c.precipitation, c.is_day),
    pressureInHg: Number((c.pressure_msl * HPA_TO_INHG).toFixed(2)),
    pressureTrend: derivePressureTrend(p0, p5),
    humidity: c.relative_humidity_2m,
    cloudCoverPercent: c.cloud_cover,
    uvIndex: c.uv_index,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** 0-360° → 8-point compass. Wraps N at 337.5°+ via `% 8`. */
function degreesToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

/**
 * Coarse plain-English condition label built from precipitation intensity
 * first (rain trumps clouds), then cloud-cover buckets. `isDay` only alters
 * the label at the "clear" tier so nighttime clear skies read naturally.
 */
function deriveConditions(cloudCover: number, precipitation: number, isDay: number): string {
  if (precipitation > 0.1) return 'Rain';
  if (precipitation > 0) return 'Light rain';
  if (cloudCover < 20) return isDay ? 'Clear' : 'Clear night';
  if (cloudCover < 50) return 'Partly cloudy';
  if (cloudCover < 80) return 'Mostly cloudy';
  return 'Overcast';
}

/**
 * 6-hour pressure trend. Delta in hPa: >1 rising, <-1 falling, else steady.
 * The 1 hPa threshold is roughly a fishable weather-change signal — smaller
 * moves are noise, larger moves genuinely shift fish activity.
 */
function derivePressureTrend(current: number, sixHoursAhead: number): 'rising' | 'falling' | 'steady' {
  const delta = sixHoursAhead - current;
  if (delta > 1.0) return 'rising';
  if (delta < -1.0) return 'falling';
  return 'steady';
}
