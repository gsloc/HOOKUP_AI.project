import { GoogleGenAI } from '@google/genai';
import { FishingContext } from '@/types';
import { selectResponse } from '@/utils/fishingResponses';
import { getCurrentLocation } from '@/services/location/locationService';
import { getCurrentTides } from '@/services/tides/tidesService';
import { getCurrentWeather, getCurrentSeason, getTimeOfDay } from '@/services/weather/weatherService';

// ─── Config ──────────────────────────────────────────────────────────────────

const MODEL      = process.env.GEMINI_MODEL      ?? 'gemini-2.5-flash';
const MAX_TOKENS = parseInt(process.env.GEMINI_MAX_TOKENS ?? '1500', 10);

// ─── Static System Prompt ────────────────────────────────────────────────────

const STATIC_SYSTEM_PROMPT = `\
You are CAST AI — an elite AI fishing intelligence platform embedded in a premium angler's companion app. You deliver tournament-caliber advice with the precision and depth of a professional guide who has spent decades on the water.

## Core Expertise

**Bass Fishing (Primary Specialty)**
Largemouth, smallmouth, and spotted bass across all seasonal phases: pre-spawn staging on secondary points and channel bends, sight fishing on beds in protected coves, post-spawn recovery patterns on deep main-lake structure, summer thermocline fishing on ledges and humps with electronics, fall bait-migration tracking from creek arms to main lake, winter deep-water finesse on the last available hard structure. You know every major tournament lake, their seasonal patterns, and the specific techniques that win on them.

**Inshore Saltwater**
Redfish, snook, tarpon, flounder, speckled trout, and striped bass. Tidal current analysis — flood vs. ebb positioning, drain exits, channel mouths, and the 45-minute feeding window centered on tide change. Flats fishing for tailing redfish, dock and bridge fishing for snook on light lines at night, live-bait presentations vs. artificial for pressured fish.

**Fly Fishing**
Trout stream reading — seam identification, pool anatomy, undercut bank targeting. Hatch matching from midge to PMD to caddis. Nymphing systems (euro, indicator, tight-line). Streamer tactics for large browns. Warmwater fly fishing for bass and carp.

**Freshwater Generalist**
Walleye on windy rock points at dusk, pike and muskie on figure-8 presentations, catfish on cut bait in current seams, crappie on vertical jigs in brush piles, panfish on ultra-light.

**Offshore and Deep Water**
Structure fishing for grouper and snapper, trolling patterns for mahi and tuna, deep drop techniques.

## Response Guidelines

**Format**
- Use **bold** for technique names, species, lure names, and critical variables
- Use ## headers only when a response requires multiple distinct sections (typically 400+ words)
- Use bullet lists for gear specs, comparisons, and multi-point strategies
- Use *italics* for secondary tips, caveats, or emphasis
- For simple direct questions: 2-3 focused paragraphs with no headers
- For multi-part or strategic questions: structured breakdown with ## headers

**Tone and Substance**
- Every response must contain at least one specific, actionable piece of advice
- Name exact lure models, hook sizes, line weights, and retrieve cadences when relevant — specificity is what separates expert advice from generic content
- Reference how current conditions (season, pressure, tide, temperature) modify the standard approach
- Do not pad responses with filler — every sentence should carry information
- Do not start with "Great question!", "Certainly!", "Of course!", or similar affirmations
- Do not add disclaimers, hedge phrases ("I'm just an AI"), or safety warnings unless genuinely safety-critical
- Write as a peer expert would speak to another serious angler, not as a customer service chatbot

**Condition Integration**
When current conditions data is available in your context, weave it naturally into your advice. Don't just list the conditions — explain their specific implication for today's fishing. "Pressure has been falling for 6 hours" translates to "fish are actively feeding right now — run your reaction baits hard."

## Knowledge Boundaries
If a user asks about a specific local lake or GPS coordinates you don't have data on, provide the general strategic framework for that type of water body (reservoir, tidal estuary, river, etc.) and note that live location data will be integrated in a future update.`;

// ─── Client Factory ───────────────────────────────────────────────────────────

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new MissingApiKeyError();
    }
    _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _client;
}

export class MissingApiKeyError extends Error {
  constructor() {
    super('GEMINI_API_KEY is not set. Add it to .env.local to enable live AI responses.');
    this.name = 'MissingApiKeyError';
  }
}

// ─── Context Gathering ────────────────────────────────────────────────────────

export async function gatherFishingContext(
  clientLocation?: import('@/types').LocationData,
): Promise<FishingContext> {
  // Location is browser-sourced (geolocation or manual entry). If the client
  // sent one in the request body, use it directly. Otherwise fall back to the
  // legacy mock so server-side calls still resolve during development.
  const locationPromise = clientLocation
    ? Promise.resolve(clientLocation)
    : getCurrentLocation().catch(() => undefined);

  // Weather requires coords — pass the client-supplied location through so the
  // Open-Meteo proxy has something to query. If no clientLocation was provided,
  // getCurrentWeather throws WeatherServiceError and Promise.allSettled turns
  // it into an undefined slot in FishingContext (the prompt builder skips it).
  const [location, weather, tides] = await Promise.allSettled([
    locationPromise,
    getCurrentWeather(clientLocation?.lat, clientLocation?.lng),
    getCurrentTides(clientLocation?.lat, clientLocation?.lng),
  ]);
  const now = new Date();
  return {
    location: location.status === 'fulfilled' ? location.value : undefined,
    weather:  weather.status  === 'fulfilled' ? weather.value  : undefined,
    tides:    tides.status    === 'fulfilled' ? tides.value    : undefined,
    season:     getCurrentSeason(now),
    timeOfDay:  getTimeOfDay(now),
  };
}

// ─── Prompt Building ──────────────────────────────────────────────────────────

/**
 * Builds the dynamic conditions block appended to the static prompt.
 * Kept separate so it can be varied per-request without touching the persona.
 */
function buildDynamicContext(context: FishingContext): string {
  const lines: string[] = ['## Live Conditions'];

  if (context.location) {
    lines.push(`- Location: ${context.location.name}${context.location.waterBody ? ` — ${context.location.waterBody}` : ''}`);
    lines.push(`- Water type: ${context.location.waterType ?? 'unknown'}`);
  }
  if (context.season)    lines.push(`- Season: ${context.season}`);
  if (context.timeOfDay) lines.push(`- Time of day: ${context.timeOfDay}`);

  if (context.weather) {
    const w = context.weather;
    lines.push(`- Air temp: ${w.temperatureF}°F`);
    lines.push(`- Conditions: ${w.conditions}`);
    lines.push(`- Wind: ${w.windSpeedMph} mph ${w.windDirection}`);
    lines.push(`- Barometric pressure: ${w.pressureInHg}" Hg (${w.pressureTrend})`);
    lines.push(`- Cloud cover: ${w.cloudCoverPercent}%`);
  }
  if (context.tides) {
    const t = context.tides;
    if (t.stationName) lines.push(`- Nearest tide station: ${t.stationName}`);
    lines.push(`- Tide: ${t.currentTrend} at ${t.currentHeight}ft`);
    if (t.nextHigh) lines.push(`- Next high: ${t.nextHigh.time} (${t.nextHigh.heightFt}ft)`);
    if (t.nextLow)  lines.push(`- Next low: ${t.nextLow.time} (${t.nextLow.heightFt}ft)`);
    lines.push(`- Moon phase: ${t.moonPhase}`);
  }

  // Manual-location disclosure: nudge the AI to mention (once) that enabling
  // browser geolocation would produce more accurate recommendations.
  if (context.location?.precise === false) {
    lines.push(
      '- NOTE: User provided location manually (no browser geolocation). Recommendations use approximate coordinates. Mention once, politely, that enabling location would give more accurate advice.',
    );
  }

  // Only include section if there is at least one data line beyond the header
  return lines.length > 1 ? lines.join('\n') : '';
}

/**
 * Joins the static persona and live conditions into a single system instruction
 * string for Gemini's config.systemInstruction field.
 */
function buildSystemInstruction(context: FishingContext): string {
  const dynamic = buildDynamicContext(context);
  return dynamic ? `${STATIC_SYSTEM_PROMPT}\n\n${dynamic}` : STATIC_SYSTEM_PROMPT;
}

// ─── Message Param Builder ────────────────────────────────────────────────────

type ConversationTurn = { role: string; content: string };

/**
 * Converts conversation history to Gemini's Content[] format.
 *
 * Role mapping:
 *   'user'      → 'user'   (unchanged)
 *   'assistant' → 'model'  (Gemini uses 'model', not 'assistant')
 *   'system'    → filtered (system context is in config.systemInstruction)
 *
 * Content format: { role, content: string } → { role, parts: [{ text }] }
 */
function toGeminiContents(
  history: ConversationTurn[],
  userMessage: string,
): Array<{ role: string; parts: Array<{ text: string }> }> {
  const mapped = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role:  m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  return [...mapped, { role: 'user', parts: [{ text: userMessage }] }];
}

// ─── Streaming Entry Point ────────────────────────────────────────────────────

/**
 * Returns a ReadableStream of raw UTF-8 text chunks.
 * The route handler pipes this directly to the HTTP Response body.
 *
 * Falls back to a single-chunk mock stream when GEMINI_API_KEY is absent
 * so the app works for anyone cloning the repo without a key.
 */
export async function streamQuery(
  userMessage: string,
  history: ConversationTurn[],
  context: FishingContext,
  signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  // ── Mock fallback ─────────────────────────────────────────────────────────
  if (!process.env.GEMINI_API_KEY) {
    const { response } = selectResponse(userMessage, context);
    return mockStream(response);
  }

  // ── Live Gemini stream ────────────────────────────────────────────────────
  const ai      = getClient();
  const encoder = new TextEncoder();
  const systemInstruction = buildSystemInstruction(context);
  const contents          = toGeminiContents(history, userMessage);

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // @google/genai takes a single argument; AbortSignal goes inside config
        // as `abortSignal` (not as a second options argument).
        const stream = await ai.models.generateContentStream({
          model: MODEL,
          contents,
          config: {
            systemInstruction,
            maxOutputTokens: MAX_TOKENS,
            abortSignal: signal,
          },
        });

        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
      } catch (err) {
        if (isAbortError(err)) {
          // Client disconnected — close cleanly, no error chunk needed
          controller.close();
          return;
        }
        // Emit a readable error message as the final stream chunk
        controller.enqueue(encoder.encode(formatStreamError(err)));
      } finally {
        controller.close();
      }
    },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Wraps a static string in a single-chunk ReadableStream. */
function mockStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

function isAbortError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'AbortError' || err.message.includes('aborted'))
  );
}

/**
 * The @google/genai SDK (0.x / 1.x) does not export a stable named error class
 * suitable for instanceof checks. Duck-type the HTTP status field instead.
 */
function formatStreamError(err: unknown): string {
  if (err instanceof Error) {
    const status = (err as { status?: number }).status;
    if (status !== undefined) {
      switch (status) {
        case 400:
          return '\n\n⚠️ *Invalid request. Check your message and try again.*';
        case 401:
        case 403:
          return '\n\n⚠️ *Invalid API key. Check your GEMINI_API_KEY in .env.local.*';
        case 429:
          return '\n\n⚠️ *Rate limit reached. Please wait a moment and try again.*';
        case 500:
        case 503:
          return '\n\n⚠️ *Gemini API is temporarily unavailable. Try again in a few seconds.*';
        default:
          return `\n\n⚠️ *API error (${status}). Please try again.*`;
      }
    }
  }
  return '\n\n⚠️ *Something went wrong. Please try again.*';
}
