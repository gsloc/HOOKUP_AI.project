import { NextRequest } from 'next/server';
import { streamQuery, gatherFishingContext, MissingApiKeyError } from '@/services/ai/fishingAssistant';
import { ChatApiRequest } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Shared response headers for all streaming replies
const STREAM_HEADERS: HeadersInit = {
  'Content-Type':           'text/plain; charset=utf-8',
  'Transfer-Encoding':      'chunked',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control':          'no-store, no-cache, must-revalidate',
  'X-Accel-Buffering':      'no',   // Disable nginx proxy buffering
};

export async function POST(req: NextRequest): Promise<Response> {
  // ── Input validation ────────────────────────────────────────────────────────
  let body: ChatApiRequest;
  try {
    body = await req.json();
  } catch {
    return jsonError('Malformed JSON in request body.', 400);
  }

  if (!body.message || typeof body.message !== 'string') {
    return jsonError('`message` is required and must be a string.', 400);
  }

  const message = body.message.trim();
  if (message.length === 0 || message.length > 2000) {
    return jsonError('`message` must be between 1 and 2000 characters.', 400);
  }

  // ── Gather context (mock services for now; real APIs in Phase 3) ────────────
  const context = await gatherFishingContext();

  // ── Stream ──────────────────────────────────────────────────────────────────
  try {
    const stream = await streamQuery(
      message,
      body.conversationHistory ?? [],
      context,
      req.signal,   // Aborts the Anthropic call if the client disconnects
    );

    return new Response(stream, { status: 200, headers: STREAM_HEADERS });
  } catch (err) {
    // Pre-stream errors (bad key, network down before first byte) — safe to
    // return a structured JSON error because streaming hasn't started yet.
    if (err instanceof MissingApiKeyError) {
      return jsonError(err.message, 503);
    }

    console.error('[api/chat] Unhandled error:', err);
    return jsonError('Internal server error. Please try again.', 500);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
