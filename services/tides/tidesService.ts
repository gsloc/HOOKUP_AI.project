import { TideData, MoonPhase } from '@/types';

export interface TidesServiceConfig {
  apiKey?: string;
  stationId?: string;
}

// Phase 2: Replace with NOAA CO-OPS Tides API or WorldTides API
export async function getCurrentTides(lat?: number, lng?: number): Promise<TideData> {
  await simulateNetworkDelay(350);
  return generateMockTideData();
}

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
  return 'MOCK_STATION_8773037'; // Phase 2: Query NOAA station lookup
}

export function getMoonPhase(date: Date = new Date()): MoonPhase {
  // Simplified lunar cycle calculation (Phase 2: use astronomy API)
  const knownNewMoon = new Date('2024-01-11T11:57:00Z');
  const msPerDay = 86400000;
  const lunarCycleDays = 29.53;
  const daysSince = (date.getTime() - knownNewMoon.getTime()) / msPerDay;
  const phase = ((daysSince % lunarCycleDays) + lunarCycleDays) % lunarCycleDays;

  if (phase < 1.85) return 'new';
  if (phase < 7.38) return 'waxing-crescent';
  if (phase < 9.22) return 'first-quarter';
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
