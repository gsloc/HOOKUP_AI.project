import { WeatherData, Season } from '@/types';

export interface WeatherServiceConfig {
  apiKey?: string;
  units?: 'imperial' | 'metric';
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class WeatherServiceError extends Error {
  constructor(message = 'Weather service failed') {
    super(message);
    this.name = 'WeatherServiceError';
  }
}

// ─── Live weather ────────────────────────────────────────────────────────────

/**
 * Fetches real current weather via the /api/weather/current server-side proxy.
 *
 * Signature is preserved as (lat?, lng?) so existing call sites don't break; if
 * coordinates are missing we throw immediately rather than silently returning
 * mock data — the AI-context gatherer wraps this in Promise.allSettled and
 * degrades gracefully when weather is unavailable.
 *
 * When invoked from server-side code (via the AI context gatherer), we need an
 * absolute URL. VERCEL_URL is populated in Vercel deployments; locally we fall
 * back to the dev port.
 */
export async function getCurrentWeather(lat?: number, lng?: number): Promise<WeatherData> {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new WeatherServiceError('Missing coordinates');
  }

  const path = `/api/weather/current?latitude=${lat}&longitude=${lng}`;
  const url = isServer() ? `${resolveBaseUrl()}${path}` : path;

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new WeatherServiceError('Network error');
  }

  if (!res.ok) {
    throw new WeatherServiceError(`Upstream ${res.status}`);
  }

  const data = (await res.json()) as WeatherData;
  return data;
}

function isServer(): boolean {
  return typeof window === 'undefined';
}

function resolveBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? '3000'}`;
}

export async function getWeatherForecast(
  lat: number,
  lng: number,
  days: number = 5,
): Promise<WeatherData[]> {
  await simulateNetworkDelay(600);
  return Array.from({ length: days }, (_, i) => ({
    ...generateMockWeatherData(),
    temperatureF: 72 + i * 2,
  }));
}

export function getCurrentSeason(date: Date = new Date()): Season {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

export function getTimeOfDay(
  date: Date = new Date(),
): 'dawn' | 'morning' | 'afternoon' | 'dusk' | 'night' {
  const hour = date.getHours();
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

export function getFishingPressureRating(weather: WeatherData): {
  rating: 1 | 2 | 3 | 4 | 5;
  label: string;
  reason: string;
} {
  let score = 3;

  if (weather.pressureTrend === 'falling') score += 2;
  else if (weather.pressureTrend === 'rising') score -= 1;

  if (weather.cloudCoverPercent > 60) score += 1;
  else if (weather.cloudCoverPercent < 20) score -= 1;

  if (weather.windSpeedMph >= 5 && weather.windSpeedMph <= 15) score += 0.5;
  else if (weather.windSpeedMph > 25) score -= 1;

  const clamped = Math.max(1, Math.min(5, Math.round(score))) as 1 | 2 | 3 | 4 | 5;

  const labels: Record<number, { label: string; reason: string }> = {
    1: { label: 'Very Slow', reason: 'Post-front high pressure — fish are deep and inactive' },
    2: { label: 'Slow', reason: 'Challenging conditions — finesse tactics recommended' },
    3: { label: 'Moderate', reason: 'Normal conditions — standard patterns should work' },
    4: { label: 'Good', reason: 'Favorable conditions — fish are more active than average' },
    5: { label: 'Excellent', reason: 'Prime conditions — falling pressure, overcast, moving air' },
  };

  return { rating: clamped, ...labels[clamped] };
}

// Retained for tests and forecast-mock fallback. Live path uses Open-Meteo above.
function generateMockWeatherData(): WeatherData {
  const conditions = ['Partly Cloudy', 'Overcast', 'Clear', 'Light Rain', 'Sunny'];
  const pressureTrends = ['rising', 'falling', 'steady'] as const;
  const windDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  return {
    temperatureF: Math.round(65 + Math.random() * 20),
    windSpeedMph: Math.round(5 + Math.random() * 15),
    windDirection: windDirections[Math.floor(Math.random() * windDirections.length)],
    conditions: conditions[Math.floor(Math.random() * conditions.length)],
    pressureInHg: parseFloat((29.5 + Math.random() * 1.5).toFixed(2)),
    pressureTrend: pressureTrends[Math.floor(Math.random() * pressureTrends.length)],
    humidity: Math.round(45 + Math.random() * 40),
    cloudCoverPercent: Math.round(Math.random() * 100),
    uvIndex: Math.round(1 + Math.random() * 9),
  };
}

function simulateNetworkDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
