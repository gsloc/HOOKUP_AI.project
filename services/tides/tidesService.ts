import { TideData, MoonPhase, TideEvent } from '@/types';

export interface TidesServiceConfig {
  apiKey?: string;
  stationId?: string;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class TideServiceError extends Error {
  constructor(message = 'Tide service failed') {
    super(message);
    this.name = 'TideServiceError';
  }
}

// ─── Live tides ──────────────────────────────────────────────────────────────

/**
 * Fetches the nearest NOAA station and today's predictions via our server-side
 * proxy routes at /api/tides/*. Two round trips: nearest-station → predictions.
 *
 * Signature preserved as (lat?, lng?) for backward compat with existing call
 * sites. Missing coords throw TideServiceError, which the AI-context gatherer
 * catches via Promise.allSettled and degrades gracefully.
 *
 * When invoked from server-side code (the AI context gatherer), we need
 * absolute URLs; browser calls use relative paths.
 */
export async function getCurrentTides(lat?: number, lng?: number): Promise<TideData> {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new TideServiceError('Missing coordinates');
  }

  // Step 1: nearest station
  const stationPath = `/api/tides/nearest-station?latitude=${lat}&longitude=${lng}`;
  const stationUrl  = isServer() ? `${resolveBaseUrl()}${stationPath}` : stationPath;

  let stationRes: Response;
  try {
    stationRes = await fetch(stationUrl);
  } catch {
    throw new TideServiceError('Network error looking up tide station');
  }
  if (!stationRes.ok) {
    throw new TideServiceError(`Nearest-station upstream ${stationRes.status}`);
  }
  const station = (await stationRes.json()) as {
    id: string;
    name: string;
    lat: number;
    lng: number;
    distanceMiles: number;
  };

  // Step 2: predictions for that station
  const predPath =
    `/api/tides/predictions?stationId=${encodeURIComponent(station.id)}` +
    `&stationName=${encodeURIComponent(station.name)}`;
  const predUrl = isServer() ? `${resolveBaseUrl()}${predPath}` : predPath;

  let predRes: Response;
  try {
    predRes = await fetch(predUrl);
  } catch {
    throw new TideServiceError('Network error fetching tide predictions');
  }
  if (!predRes.ok) {
    throw new TideServiceError(`Predictions upstream ${predRes.status}`);
  }

  const pred = (await predRes.json()) as {
    stationName: string;
    currentHeight: number;
    state: 'incoming' | 'outgoing' | 'slack-high' | 'slack-low';
    nextHigh: { time: string; height: number } | null;
    nextLow:  { time: string; height: number } | null;
  };

  return {
    currentHeight: pred.currentHeight,
    // Collapse the 4-state discrimination into the existing 3-state union so
    // downstream consumers (prompt builder, mock response library) don't
    // require refactoring.
    currentTrend:
      pred.state === 'slack-high' || pred.state === 'slack-low' ? 'slack' : pred.state,
    nextHigh: pred.nextHigh ? toTideEvent(pred.nextHigh) : null,
    nextLow:  pred.nextLow  ? toTideEvent(pred.nextLow)  : null,
    moonPhase: getMoonPhase(new Date()),
    stationName: pred.stationName || station.name,
  };
}

function toTideEvent(e: { time: string; height: number }): TideEvent {
  return {
    time: formatEventTime(e.time),
    heightFt: Number(e.height.toFixed(2)),
  };
}

/**
 * Format the ISO 8601 event time returned by the predictions route into the
 * short "HH:MM AM/PM" wall-clock string the prompt builder already emits.
 * If parsing fails, fall through to the raw string.
 */
function formatEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ─── Server/browser URL resolver (mirrors weatherService pattern) ────────────

function isServer(): boolean {
  return typeof window === 'undefined';
}

function resolveBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? '3000'}`;
}

// ─── Legacy mocks (kept per untouched-legacy convention) ─────────────────────

export async function getTideForecast(
  lat: number,
  lng: number,
  days: number = 3,
): Promise<TideData[]> {
  await simulateNetworkDelay(500);
  return Array.from({ length: days * 2 }, () => generateMockTideData());
}

export async function getNearestTideStation(lat: number, lng: number): Promise<string> {
  await simulateNetworkDelay(200);
  return 'MOCK_STATION_8773037';
}

export function getMoonPhase(date: Date = new Date()): MoonPhase {
  const knownNewMoon = new Date('2024-01-11T11:57:00Z');
  const msPerDay = 86400000;
  const lunarCycleDays = 29.53;
  const daysSince = (date.getTime() - knownNewMoon.getTime()) / msPerDay;
  const phase = ((daysSince % lunarCycleDays) + lunarCycleDays) % lunarCycleDays;

  if (phase < 1.85)  return 'new';
  if (phase < 7.38)  return 'waxing-crescent';
  if (phase < 9.22)  return 'first-quarter';
  if (phase < 14.77) return 'waxing-gibbous';
  if (phase < 16.61) return 'full';
  if (phase < 22.15) return 'waning-gibbous';
  if (phase < 23.99) return 'last-quarter';
  return 'waning-crescent';
}

function generateMockTideData(): TideData {
  const now = new Date();
  const trends = ['incoming', 'outgoing', 'slack'] as const;
  const currentTrend = trends[Math.floor(Math.random() * trends.length)];

  const nextHighHours = Math.floor(Math.random() * 6) + 1;
  const nextLowHours = nextHighHours + 3;

  const nextHighTime = new Date(now.getTime() + nextHighHours * 3600000);
  const nextLowTime = new Date(now.getTime() + nextLowHours * 3600000);

  return {
    currentHeight: parseFloat((Math.random() * 4 + 1).toFixed(1)),
    currentTrend,
    nextHigh: {
      time: nextHighTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      heightFt: parseFloat((Math.random() * 2 + 4).toFixed(1)),
    },
    nextLow: {
      time: nextLowTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      heightFt: parseFloat((Math.random() * 1.5).toFixed(1)),
    },
    moonPhase: getMoonPhase(now),
  };
}

function simulateNetworkDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
