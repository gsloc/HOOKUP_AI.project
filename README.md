# CAST AI

An AI-powered fishing assistant that delivers tournament-level advice through a streaming chat interface.

🎣 Live demo: (https://hookup-ai-project.vercel.app)

![CAST AI chat interface](docs/screenshot.png)

---

## Features

- **Streaming AI responses** — text streams token-by-token from the Gemini API directly into the chat UI, with a live cursor while the response is generating
- **Fishing-domain expert system prompt** — a carefully crafted persona covering bass fishing, inshore saltwater, fly fishing, and freshwater species, with formatting and tone guidelines baked in
- **Real-time context** — tide, weather, and location data are wired into the system prompt (mock services in place; Phase 3 connects live APIs)
- **Responsive glassmorphic UI** — centered chat interface on a deep ocean-blue background, fully usable on mobile and desktop
- **Graceful mock fallback** — the app runs without any API key configured, returning curated fishing responses from a local library

---

## Tech Stack

- [Next.js 14](https://nextjs.org) (App Router) — React frontend + Node.js API routes in one framework
- [TypeScript](https://www.typescriptlang.org) — end-to-end type safety across services, hooks, and components
- [Tailwind CSS](https://tailwindcss.com) — utility-first styling with a custom ocean color palette
- [Google Gemini API](https://aistudio.google.com) (`@google/genai`) — live LLM streaming
- [Open-Meteo](https://open-meteo.com) *(planned)* — weather data
- [NOAA CO-OPS](https://tidesandcurrents.noaa.gov/api/) *(planned)* — tide and current data
- [Browser Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) *(planned)* — user location
- Deployed on [Vercel](https://vercel.com)

---

## How It Works

External data sources — location, tides, and weather — each live in their own service module under `services/`. Every module exports the same async interface regardless of whether the implementation is a real API call or a mock, so swapping in a live data source in Phase 3 requires changing only one file and nothing else. The AI service (`services/ai/fishingAssistant.ts`) calls all three in parallel using `Promise.allSettled`, assembles the results into a structured fishing context object, and injects that context into the Gemini system prompt alongside the static expert persona.

When a user sends a message, the Next.js API route (`app/api/chat/route.ts`) passes it to the AI service, which returns a `ReadableStream<Uint8Array>`. The route pipes that stream directly as the HTTP response body with `Content-Type: text/plain`. On the client, the `useChat` hook reads the stream chunk-by-chunk via `getReader()`, dispatching an `APPEND_TO_MESSAGE` reducer action on each token so the response text appears incrementally in the UI — no polling, no full-page re-renders.

The system prompt is split into two parts: a static fishing-expert persona (~650 tokens) and a dynamic conditions block that varies per request. The static block describes the AI's expertise domains, response formatting rules, and tone guidelines. The dynamic block appends current season, time of day, weather, tide state, and location so the AI's advice reflects today's actual conditions rather than generic defaults.

---

## Getting Started Locally

1. **Clone the repo**
   ```bash
   git clone https://github.com/gsloc/HOOKUP_AI.project.git
   cd HOOKUP_AI.project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Open `.env.local` and add your Gemini API key:
   ```
   GEMINI_API_KEY=AIza...
   ```
   Get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). The app works without a key — it falls back to the local mock response library automatically.

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open the app**

   Visit [http://localhost:3000](http://localhost:3000).

---

## Roadmap

- [x] Phase 1 — UI, architecture, and service-layer scaffolding
- [x] Phase 2 — Live LLM streaming via Google Gemini
- [ ] Phase 3 — Real weather (Open-Meteo), tides (NOAA CO-OPS), and location (browser geolocation)
- [ ] Phase 4 — Persistent conversation history
- [ ] Phase 5 — Rate limiting for production use

---

## License

MIT — see `LICENSE` for details.

---

## Author

Built by [Garrett Slocumb](https://github.com/gsloc) (https://www.linkedin.com/in/garrett-slocumb-b17035280/)
