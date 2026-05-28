'use client';

import { useReducer, useCallback, useRef, useLayoutEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, ChatState, ChatAction, ChatApiRequest } from '@/types';

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

// ─── Initial welcome message ──────────────────────────────────────────────────

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: `**Welcome to your AI Fishing Assistant.** I'm built to give you tournament-level intel, right from your phone.\n\nHere's what I can help you with:\n\n🎣 **Bass Fishing** — Pre-spawn staging, bed fishing tactics, deep summer ledges, fall migrations, winter survival patterns\n🌊 **Tidal Analysis** — Real-time tide windows, current seams, optimal feeding phases\n🌤️ **Weather Integration** — Barometric pressure fronts, wind patterns, cloud cover strategies\n📍 **Location Scouting** — Water body breakdowns, structure identification, seasonal movement mapping\n🪝 **Gear & Technique** — Rigging, presentation angles, retrieve cadences, line selection\n\nJust ask me anything — *"Best technique for post-spawn largemouth?"* or *"How does a cold front affect bass behavior?"* — and I'll give you the same advice a professional guide would charge $500/day for.`,
  timestamp: new Date(),
};

const initialState: ChatState = {
  messages: [WELCOME_MESSAGE],
  isLoading: false,
  error: null,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChat() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Mirror of mutable state for use inside async callbacks.
   *
   * Because sendMessage is wrapped in useCallback with no deps (stable ref),
   * it would otherwise close over stale values. Reading from this ref inside
   * the async body ensures we always see the latest messages/isLoading without
   * recreating the callback on every streaming token (which would re-render
   * ChatInput on every chunk).
   */
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  });

  // ── sendMessage ─────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || stateRef.current.isLoading) return;

    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 1. Append the user message immediately
    dispatch({
      type: 'ADD_MESSAGE',
      payload: { id: uuidv4(), role: 'user', content: trimmed, timestamp: new Date() },
    });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    // 2. Pre-seed an empty assistant message. Its ID will receive all stream chunks.
    const assistantId = uuidv4();
    dispatch({
      type: 'ADD_MESSAGE',
      payload: { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
    });

    try {
      const requestBody: ChatApiRequest = {
        message: trimmed,
        conversationHistory: stateRef.current.messages
          .filter((m) => m.id !== 'welcome')
          .slice(-8)   // Send last 8 turns for conversational context
          .map(({ role, content }) => ({ role, content })),
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      // Non-2xx before any streaming data arrived → structured error
      if (!res.ok) {
        let errMsg = `Request failed (${res.status})`;
        try {
          const errBody = await res.json();
          if (errBody?.error) errMsg = errBody.error;
        } catch { /* ignore JSON parse failure */ }
        throw new Error(errMsg);
      }

      // 3. Read the stream and append each decoded chunk to the seeded message
      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          dispatch({ type: 'APPEND_TO_MESSAGE', payload: { id: assistantId, chunk } });
        }
      }

      // Flush any remaining bytes the decoder held in its internal buffer
      const tail = decoder.decode();
      if (tail) {
        dispatch({ type: 'APPEND_TO_MESSAGE', payload: { id: assistantId, chunk: tail } });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;

      const fallback =
        err instanceof Error && err.message.length < 200
          ? err.message
          : "I'm having trouble connecting right now. Please check your connection and try again.\n\n*Tip: While I'm offline, review the fundamentals — matching your presentation depth to where fish are holding is the single highest-leverage adjustment you can make.*";

      // Replace the empty seeded message with the error content
      dispatch({ type: 'APPEND_TO_MESSAGE', payload: { id: assistantId, chunk: fallback } });
      dispatch({ type: 'SET_ERROR', payload: fallback });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []); // ← No deps: reads latest state via stateRef, never stale

  // ── clearMessages ───────────────────────────────────────────────────────────

  const clearMessages = useCallback(() => {
    abortControllerRef.current?.abort();
    dispatch({ type: 'CLEAR_MESSAGES' });
    dispatch({
      type: 'ADD_MESSAGE',
      payload: { ...WELCOME_MESSAGE, id: uuidv4(), timestamp: new Date() },
    });
  }, []);

  return {
    messages:     state.messages,
    isLoading:    state.isLoading,
    error:        state.error,
    sendMessage,
    clearMessages,
  };
}
