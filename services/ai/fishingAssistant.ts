import Anthropic from '@anthropic-ai/sdk';
import type { TextBlockParam } from '@anthropic-ai/sdk/resources/messages';
import { FishingContext } from '@/types';
import { selectResponse } from '@/utils/fishingResponses';
import { getCurrentLocation } from '@/services/location/locationService';
import { getCurrentTides } from '@/services/tides/tidesService';
import { getCurrentWeather, getCurrentSeason, getTimeOfDay } from '@/services/weather/weatherService';

// ─── Config ──────────────────────────────────────────────────────────────────

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';
const MAX_TOKENS = parseInt(process.env.ANTHROPIC_MAX_TOKENS ?? '1500', 10);

// ─── Static System Prompt (prompt-cached across requests) ────────────────────
// Keep this block > 1024 tokens so it qualifies for Anthropic prompt caching.

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

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new MissingApiKeyError();
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export class MissingApiKeyError extends Error {
  constructor() {
    super('ANTHROPIC_API_KEY is not set. Add it to .env.local to enable live AI responses.');
    this.name = 'MissingApiKeyError';
  }
}

// ─── Context Gathering ────────────────────────────────────────────────────────

export async function gatherFishingContext(): Promise<FishingContext> {
  const [location, weather, tides] = await Promise.allSettled([
    getCurrentLocation(),
    getCurrentWeather(),
    getCurrentTides(),
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
 * Builds the dynamic conditions block appended to the cached static prompt.
 * Kept separate so the static portion can be cached while this portion varies.
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
    lines.push(`- Tide: ${t.currentTrend} at ${t.currentHeight}ft`);
    lines.push(`- Next high: ${t.nextHigh.time} (${t.nextHigh.heightFt}ft)`);
    lines.push(`- Next low: ${t.nextLow.time} (${t.nextLow.heightFt}ft)`);
    lines.push(`- Moon phase: ${t.moonPhase}`);
  }

  // Only add the section if we have at least some data beyond the header
  return lines.length > 1 ? lines.join('\n') : '';
}

/**
 * Returns the two system-prompt blocks.
 * The static block carries cache_control so Anthropic caches it across requests;
 * the dynamic block is intentionally left uncached because it changes each call.
 */
export function buildSystemBlocks(context: FishingContext): TextBlockParam[] {
  const blocks: TextBlockParam[] = [
    {
      type: 'text',
      text: STATIC_SYSTEM_PROMPT,
      cache_control: { type: 'ephemeral' },   // Cache the large static persona
    },
  ];

  const dynamic = buildDynamicContext(context);
  if (dynamic) {
    blocks.push({ type: 'text', text: dynamic });
  }

  return blocks;
}

// ─── Message Param Builder ────────────────────────────────────────────────────

type ConversationTurn = { role: string; content: string };

function toAnthropicMessages(
  history: ConversationTurn[],
  userMessage: string,
): Anthropic.Messages.MessageParam[] {
  const filtered = history
    .filter((m): m is { role: 'user' | 'assistant'; content: string } =>
      m.role === 'user' || m.role === 'assistant',
    )
    .map((m) => ({ role: m.role, content: m.content }));

  return [...filtered, { role: 'user' as const, content: userMessage }];
}

// ─── Streaming Entry Point ────────────────────────────────────────────────────

/**
 * Returns a ReadableStream of raw text chunks.
 * Callers (the route handler) pipe this directly to the HTTP Response.
 *
 * Falls back to a single-chunk mock stream when ANTHROPIC_API_KEY is absent
 * so the app works in development without a key.
 */
export async function streamQuery(
  userMessage: string,
  history: ConversationTurn[],
  context: FishingContext,
  signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  // ── Mock fallback ─────────────────────────────────────────────────────────
  if (!process.env.ANTHROPIC_API_KEY) {
    const { response } = selectResponse(userMessage, context);
    return mockStream(response);
  }

  // ── Live Anthropic stream ─────────────────────────────────────────────────
  const client   = getClient();
  const encoder  = new TextEncoder();
  const system   = buildSystemBlocks(context);
  const messages = toAnthropicMessages(history, userMessage);

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = client.messages.stream(
          { model: MODEL, max_tokens: MAX_TOKENS, system, messages },
          { signal },
        );

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        if (isAbortError(err)) {
          // Client disconnected — close cleanly, no error chunk needed
          controller.close();
          return;
        }
        // Emit a readable error token the UI can display
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

function formatStreamError(err: unknown): string {
  if (err instanceof Anthropic.APIError) {
    switch (err.status) {
      case 401:
        return '\n\n⚠️ *Invalid API key. Check your ANTHROPIC_API_KEY in .env.local.*';
      case 429:
        return '\n\n⚠️ *Rate limit reached. Please wait a moment and try again.*';
      case 529:
        return '\n\n⚠️ *Anthropic API is temporarily overloaded. Try again in a few seconds.*';
      default:
        return `\n\n⚠️ *API error (${err.status}). Please try again.*`;
    }
  }
  return '\n\n⚠️ *Something went wrong. Please try again.*';
}
