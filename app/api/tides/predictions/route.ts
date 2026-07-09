import { NextRequest, NextResponse } from 'next/server';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NoaaPrediction {
  t: string;    // "YYYY-MM-DD HH:MM" (local time)
  v: string;    // height in feet
  type: 'H' | 'L';
}

interface TideEventOut {
  time: string;    // ISO 8601 with local tz offset
  height: number;  // feet
}

type TideState = 'incoming' | 'outgoing' | 'slack-high' | 'slack-low';

interface PredictionsResponse {
  stationName: string;
  currentHeight: number;
  state: TideState;
  nextHigh: TideEventOut | null;
  nextLow: TideEventOut | null;
}

// ─── Route ───────────────────────────────────────────────────────────────────

/**
 * Fetches today+tomorrow's high/low tide predictions from NOAA CO-OPS for
 * the given station and derives the current tide state (incoming / outgoing /
 * slack-high / slack-low) plus a linearly-interpolated current height.
 *
 * The 48-hour window guarantees we can always find a "next high" and
 * "next low" after now, unless the request lands moments before the very
 * last predicted event — in which case those fields are null.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const stationId  = req.nextUrl.searchParams.get('stationId');
  const stationName = req.nextUrl.searchParams.get('stationName') ?? '';

  if (!stationId) {
    return NextResponse.json({ error: 'Missing stationId' }, { status: 400 });
  }

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const beginDate = formatYYYYMMDD(now);
  const endDate   = formatYYYYMMDD(tomorrow);

  const noaaUrl =
    `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` +
    `?product=predictions` +
    `&application=HOOKUP_AI` +
    `&station=${encodeURIComponent(stationId)}` +
    `&begin_date=${beginDate}` +
    `&end_date=${endDate}` +
    `&datum=MLLW` +
    `&time_zone=lst_ldt` +
    `&units=english` +
    `&interval=hilo` +
    `&format=json`;

  let noaaRes: Response;
  try {
    noaaRes = await fetch(noaaUrl, { cache: 'no-store' });
  } catch {
    return NextResponse.json({ error: 'Tide service unavailable' }, { status: 502 });
  }

  if (!noaaRes.ok) {
    return NextResponse.json({ error: 'Tide service unavailable' }, { status: 502 });
  }

  const data = await noaaRes.json();

  // NOAA returns { error: { message } } for known errors (bad station, no data)
  if (data?.error) {
    return NextResponse.json({ error: 'No tide data for this station' }, { status: 502 });
  }

  const predictions: NoaaPrediction[] = Array.isArray(data?.predictions) ? data.predictions : [];
  if (predictions.length === 0) {
    return NextResponse.json({ error: 'No tide data for this station' }, { status: 502 });
  }

  const analysis = analyzeTideState(predictions, now);

  const response: PredictionsResponse = {
    stationName,
    currentHeight: Number(analysis.currentHeight.toFixed(2)),
    state: analysis.state,
    nextHigh: analysis.nextHigh,
    nextLow:  analysis.nextLow,
  };
  return NextResponse.json(response);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatYYYYMMDD(d: Date): string {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Parse a NOAA time string. NOAA returns local station time as
 * "YYYY-MM-DD HH:MM" with no zone suffix. new Date() will interpret it
 * in the *server's* local zone — good enough for our diff math because both
 * sides use the server clock; the ISO string we emit downstream will carry
 * that same zone offset so clients render the correct wall-clock time.
 */
function parseNoaaTime(t: string): Date {
  // ISO-ify: "2026-07-08 05:24" → "2026-07-08T05:24"
  return new Date(t.replace(' ', 'T'));
}

function interpolateCurrentHeight(prev: NoaaPrediction, next: NoaaPrediction, now: Date): number {
  const prevTime = parseNoaaTime(prev.t).getTime();
  const nextTime = parseNoaaTime(next.t).getTime();
  const nowTime  = now.getTime();
  if (nextTime === prevTime) return parseFloat(prev.v);
  const progress = Math.max(0, Math.min(1, (nowTime - prevTime) / (nextTime - prevTime)));
  const prevH = parseFloat(prev.v);
  const nextH = parseFloat(next.v);
  return prevH + (nextH - prevH) * progress;
}

/**
 * Find the H/L pair straddling `now`, derive tide state + current height,
 * and locate the next H and next L after now.
 */
function analyzeTideState(
  predictions: NoaaPrediction[],
  now: Date,
): {
  currentHeight: number;
  state: TideState;
  nextHigh: TideEventOut | null;
  nextLow: TideEventOut | null;
} {
  const nowMs = now.getTime();
  const SLACK_WINDOW_MS = 30 * 60 * 1000;

  // Sort defensively (NOAA already returns chronological order)
  const sorted = [...predictions].sort(
    (a, b) => parseNoaaTime(a.t).getTime() - parseNoaaTime(b.t).getTime(),
  );

  // Find the straddling pair: last event <= now, first event > now
  let prevIdx = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (parseNoaaTime(sorted[i].t).getTime() <= nowMs) prevIdx = i;
    else break;
  }
  const prev = prevIdx >= 0 ? sorted[prevIdx] : null;
  const next = prevIdx + 1 < sorted.length ? sorted[prevIdx + 1] : null;

  // Current height by linear interpolation (falls back if we lack one side)
  let currentHeight: number;
  if (prev && next) currentHeight = interpolateCurrentHeight(prev, next, now);
  else if (next)    currentHeight = parseFloat(next.v);
  else if (prev)    currentHeight = parseFloat(prev.v);
  else              currentHeight = 0;

  // Next H and next L after now
  const nextHighRaw = sorted.find((p) => p.type === 'H' && parseNoaaTime(p.t).getTime() > nowMs) ?? null;
  const nextLowRaw  = sorted.find((p) => p.type === 'L' && parseNoaaTime(p.t).getTime() > nowMs) ?? null;

  // State derivation
  let state: TideState;
  if (prev && next) {
    const prevDelta = Math.abs(nowMs - parseNoaaTime(prev.t).getTime());
    const nextDelta = Math.abs(parseNoaaTime(next.t).getTime() - nowMs);
    const nearest = prevDelta < nextDelta ? prev : next;
    const nearestDelta = Math.min(prevDelta, nextDelta);

    if (nearestDelta <= SLACK_WINDOW_MS) {
      state = nearest.type === 'H' ? 'slack-high' : 'slack-low';
    } else {
      // Moving from prev to next. Type of `next` tells us the direction:
      // heading to a High = incoming; heading to a Low = outgoing.
      state = next.type === 'H' ? 'incoming' : 'outgoing';
    }
  } else if (next) {
    state = next.type === 'H' ? 'incoming' : 'outgoing';
  } else if (prev) {
    // Beyond our prediction window — reflect the last known direction
    state = prev.type === 'H' ? 'outgoing' : 'incoming';
  } else {
    state = 'slack-low';
  }

  return {
    currentHeight,
    state,
    nextHigh: nextHighRaw ? toEventOut(nextHighRaw) : null,
    nextLow:  nextLowRaw  ? toEventOut(nextLowRaw)  : null,
  };
}

/**
 * Convert a NOAA prediction to an ISO 8601 string with the server's tz offset,
 * preserving the wall-clock time NOAA gave us (which was already local to the
 * station in most cases where the server co-locates with the user).
 */
function toEventOut(p: NoaaPrediction): TideEventOut {
  const d = parseNoaaTime(p.t);
  return {
    time: toLocalIso(d),
    height: Number(parseFloat(p.v).toFixed(2)),
  };
}

function toLocalIso(d: Date): string {
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const oh = pad2(Math.floor(Math.abs(offsetMin) / 60));
  const om = pad2(Math.abs(offsetMin) % 60);
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}` +
    `${sign}${oh}:${om}`
  );
}
