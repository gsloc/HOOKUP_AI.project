'use client';

import { useReducer, useCallback, useRef, useLayoutEffect, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, ChatState, ChatAction, ChatApiRequest, LocationData } from '@/types';
import {
  getChat,
  appendMessage,
  updateChat,
  setChatTitle,
} from '@/services/storage/chatStorage';

// ─── Reducer ─────────────────────────────────────────────────────────────────

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };

    case 'APPEND_TO_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.payload.id
            ? { ...m, content: m.content + action.payload.chunk }
            : m,
        ),
      };

    case 'LOAD_MESSAGES':
      return { ...state, messages: action.payload, error: null };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'CLEAR_MESSAGES':
      return { ...state, messages: [], error: null };

    default:
      return state;
  }
}

// ─── Welcome (UI-only, never persisted) ──────────────────────────────────────

const WELCOME_CONTENT = `**Welcome to your AI Fishing Assistant.** I'm built to give you tournament-level intel, right from your phone.\n\nHere's what I can help you with:\n\n🎣 **Bass Fishing** — Pre-spawn staging, bed fishing tactics, deep summer ledges, fall migrations, winter survival patterns\n🌊 **Tidal Analysis** — Real-time tide windows, current seams, optimal feeding phases\n🌤️ **Weather Integration** — Barometric pressure fronts, wind patterns, cloud cover strategies\n📍 **Location Scouting** — Water body breakdowns, structure identification, seasonal movement mapping\n🪝 **Gear & Technique** — Rigging, presentation angles, retrieve cadences, line selection\n\nJust ask me anything — *"Best technique for post-spawn largemouth?"* or *"How does a cold front affect bass behavior?"* — and I'll give you the same advice a professional guide would charge $500/day for.`;

function makeWelcomeMessage(): Message {
  return {
    id: 'welcome',
    role: 'assistant',
    content: WELCOME_CONTENT,
    timestamp: new Date(),
  };
}

const initialState: ChatState = {
  messages: [makeWelcomeMessage()],
  isLoading: false,
  error: null,
};

// ─── Mention-detection regexes ───────────────────────────────────────────────
// Deliberately generous — goal is to avoid double-nudging, not to be precise.

const WEATHER_RE = /\b(?:weather|temperature|temp|pressure|barometric|barometer|wind|gust|breeze|windy|calm|humidity|humid|muggy|cloud|cloudy|overcast|sunny|clear sky|rain|showers|drizzle|front)\b|°[FC]/i;
const TIDE_RE    = /\b(?:tide|tidal|incoming|outgoing|flood|ebb|slack|high water|low water)\b/i;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChat(location: LocationData | null = null, chatId: string | null = null) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Refs used inside the stable sendMessage callback.
  const stateRef    = useRef(state);
  const locationRef = useRef(location);
  const chatIdRef   = useRef(chatId);
  useLayoutEffect(() => {
    stateRef.current    = state;
    locationRef.current = location;
    chatIdRef.current   = chatId;
  });

  // ── Load persisted messages when chatId changes ─────────────────────────────

  useEffect(() => {
    if (!chatId) return;
    const chat = getChat(chatId);
    if (!chat) return;
    // Prepend the welcome message for display only if this chat has no real turns yet.
    const initial: Message[] =
      chat.messages.length === 0
        ? [makeWelcomeMessage()]
        : chat.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
    dispatch({ type: 'LOAD_MESSAGES', payload: initial });
  }, [chatId]);

  // ── sendMessage ─────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || stateRef.current.isLoading) return;

    const activeChatId = chatIdRef.current;
    if (!activeChatId) return;   // No active chat — refuse to send

    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 1. Append the user message (in-state + persisted)
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    appendMessage(activeChatId, userMessage);

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    // 2. Pre-seed an empty assistant message. Its ID will receive all stream chunks.
    const assistantId = uuidv4();
    const seededAssistant: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: seededAssistant });

    // Snapshot mention flags from persisted chat (before this exchange)
    const chatBefore = getChat(activeChatId);
    const weatherMentioned = chatBefore?.weatherMentioned === true;
    const tidesMentioned   = chatBefore?.tidesMentioned   === true;

    try {
      const requestBody: ChatApiRequest = {
        message: trimmed,
        conversationHistory: stateRef.current.messages
          .filter((m) => m.id !== 'welcome')
          .slice(-8)
          .map(({ role, content }) => ({ role, content })),
        ...(locationRef.current ? { location: locationRef.current } : {}),
        weatherMentioned,
        tidesMentioned,
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!res.ok) {
        let errMsg = `Request failed (${res.status})`;
        try {
          const errBody = await res.json();
          if (errBody?.error) errMsg = errBody.error;
        } catch { /* ignore */ }
        throw new Error(errMsg);
      }

      // 3. Read the stream and append each decoded chunk
      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          full += chunk;
          dispatch({ type: 'APPEND_TO_MESSAGE', payload: { id: assistantId, chunk } });
        }
      }
      const tail = decoder.decode();
      if (tail) {
        full += tail;
        dispatch({ type: 'APPEND_TO_MESSAGE', payload: { id: assistantId, chunk: tail } });
      }

      // 4. Persist the completed assistant message
      const finalAssistant: Message = { ...seededAssistant, content: full };
      appendMessage(activeChatId, finalAssistant);

      // 5. Update mention flags based on what the AI actually said
      const newWeatherMentioned = weatherMentioned || WEATHER_RE.test(full);
      const newTidesMentioned   = tidesMentioned   || TIDE_RE.test(full);
      if (newWeatherMentioned !== weatherMentioned || newTidesMentioned !== tidesMentioned) {
        updateChat(activeChatId, {
          weatherMentioned: newWeatherMentioned,
          tidesMentioned:   newTidesMentioned,
        });
      }

      // 6. First-exchange title generation (non-blocking, fire-and-forget)
      const chatAfter = getChat(activeChatId);
      const isFirstExchange =
        chatAfter?.messages.length === 2 &&    // just the user + assistant we added
        chatAfter?.title.endsWith(' · New chat');
      if (isFirstExchange) {
        void generateAndSetTitle(activeChatId, trimmed, full);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;

      const fallback =
        err instanceof Error && err.message.length < 200
          ? err.message
          : "I'm having trouble connecting right now. Please check your connection and try again.\n\n*Tip: While I'm offline, review the fundamentals — matching your presentation depth to where fish are holding is the single highest-leverage adjustment you can make.*";

      dispatch({ type: 'APPEND_TO_MESSAGE', payload: { id: assistantId, chunk: fallback } });
      dispatch({ type: 'SET_ERROR', payload: fallback });
      // Persist the error message so a refresh doesn't leave an empty assistant bubble
      appendMessage(activeChatId, { ...seededAssistant, content: fallback });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── clearMessages (legacy — kept to avoid churn in ChatInterface callers) ──

  const clearMessages = useCallback(() => {
    abortControllerRef.current?.abort();
    dispatch({ type: 'CLEAR_MESSAGES' });
    dispatch({ type: 'ADD_MESSAGE', payload: makeWelcomeMessage() });
  }, []);

  return {
    messages:  state.messages,
    isLoading: state.isLoading,
    error:     state.error,
    sendMessage,
    clearMessages,
  };
}

// ─── Title generation helper ─────────────────────────────────────────────────

async function generateAndSetTitle(chatId: string, userMessage: string, aiResponse: string): Promise<void> {
  try {
    const res = await fetch('/api/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage, aiResponse }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { title?: string };
    if (data.title && data.title.trim()) {
      setChatTitle(chatId, data.title.trim());
      // Dispatch a synthetic event so ChatSidebar can refresh its list without polling
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hookup:chats-changed'));
      }
    }
  } catch {
    // Non-critical — chat keeps its "New chat" placeholder title
  }
}
