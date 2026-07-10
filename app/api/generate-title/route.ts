import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Note: gemini-2.5-flash-lite has been retired by Google for new API keys
// (returns 404 NOT_FOUND). Using gemini-2.5-flash with maxOutputTokens=20
// keeps per-title cost negligible.
const TITLE_MODEL = 'gemini-2.5-flash';
const FALLBACK    = 'Fishing Trip';

/**
 * Generates a 2–5 word chat title from the first user/AI exchange. Uses the
 * cheapest Gemini tier because titles are non-critical and this runs on every
 * new chat.
 *
 * Always returns 200 with { title } — never throws to the caller. Failure
 * modes (missing key, upstream error, empty response) fall through to
 * FALLBACK so the sidebar never shows a broken title.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let userMessage = '';
  let aiResponse  = '';

  try {
    const body = await req.json();
    userMessage = typeof body.userMessage === 'string' ? body.userMessage : '';
    aiResponse  = typeof body.aiResponse  === 'string' ? body.aiResponse  : '';
  } catch {
    return NextResponse.json({ title: FALLBACK });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ title: FALLBACK });
  }

  const systemInstruction =
    `You generate short, evocative titles for fishing chats. Return ONLY the title in 2-5 words. ` +
    `No quotes, no punctuation, no explanation. Focus on the fish species, location, or fishing style ` +
    `if mentioned. Examples: "Wrightsville Redfish", "Bass at Falls Lake", "Fly Fishing the Davidson", ` +
    `"Inshore Flounder Trip". If neither the user message nor AI response mentions specifics, ` +
    `return a generic descriptor like "Fishing Trip" or "Angler Advice".`;

  const prompt = `User message: ${userMessage.slice(0, 500)}\nAI response: ${aiResponse.slice(0, 1500)}`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await ai.models.generateContent({
      model: TITLE_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        // Disable Gemini 2.5 Flash's thinking mode — its reasoning tokens
        // otherwise consume most of maxOutputTokens and truncate the response.
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 20,
      },
    });

    const raw = result.text ?? '';
    const cleaned = raw
      .replace(/["'`]/g, '')
      .replace(/[.!?]+$/g, '')
      .trim();

    if (!cleaned) return NextResponse.json({ title: FALLBACK });

    // Collapse to at most 5 words for safety
    const words = cleaned.split(/\s+/).slice(0, 5).join(' ');
    return NextResponse.json({ title: words || FALLBACK });
  } catch {
    return NextResponse.json({ title: FALLBACK });
  }
}
