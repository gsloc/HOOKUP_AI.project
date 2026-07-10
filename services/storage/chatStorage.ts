import { Chat, Message, LocationData } from '@/types';

// ─── Keys ────────────────────────────────────────────────────────────────────

const CHATS_KEY  = 'hookup_chats';
const ACTIVE_KEY = 'hookup_active_chat_id';

// ─── SSR-safe accessor ───────────────────────────────────────────────────────

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

// ─── Reads ───────────────────────────────────────────────────────────────────

/**
 * Returns all chats sorted by updatedAt DESC (most recent first).
 * Safe to call server-side (returns []) and safe on malformed JSON.
 */
export function getAllChats(): Chat[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(CHATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Chat[];
    if (!Array.isArray(parsed)) return [];
    // Defensive: filter out malformed entries
    const chats = parsed.filter(
      (c): c is Chat =>
        c && typeof c.id === 'string' && typeof c.title === 'string' && Array.isArray(c.messages),
    );
    return chats.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  } catch {
    return [];
  }
}

export function getChat(chatId: string): Chat | null {
  if (!hasStorage() || !chatId) return null;
  const chats = getAllChats();
  return chats.find((c) => c.id === chatId) ?? null;
}

export function getActiveChatId(): string | null {
  if (!hasStorage()) return null;
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

// ─── Writes ──────────────────────────────────────────────────────────────────

function writeChats(chats: Chat[]): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch {
    // Quota exceeded / private mode — non-fatal, chats will be lost on refresh
  }
}

export function setActiveChatId(chatId: string | null): void {
  if (!hasStorage()) return;
  try {
    if (chatId) window.localStorage.setItem(ACTIVE_KEY, chatId);
    else        window.localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // Non-fatal
  }
}

// ─── Chat lifecycle ──────────────────────────────────────────────────────────

/**
 * Creates a new chat, persists it, and marks it active. Returns the new Chat.
 * Title format: "Sunday Jul 12 · New chat" — the descriptor is later replaced
 * by the title-generation route once the first exchange completes.
 */
export function createChat(location?: LocationData): Chat {
  const now = new Date();
  const chat: Chat = {
    id: generateId(),
    title: `${formatDate(now)} · New chat`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    messages: [],
    locationContext: location,
    weatherMentioned: false,
    tidesMentioned: false,
  };
  const chats = [chat, ...getAllChats()];
  writeChats(chats);
  setActiveChatId(chat.id);
  return chat;
}

/**
 * Merges updates into an existing chat and bumps updatedAt. If the chat
 * doesn't exist, silently does nothing.
 */
export function updateChat(chatId: string, updates: Partial<Chat>): void {
  const chats = getAllChats();
  const idx = chats.findIndex((c) => c.id === chatId);
  if (idx === -1) return;
  chats[idx] = {
    ...chats[idx],
    ...updates,
    id: chats[idx].id,                    // ID is immutable
    updatedAt: new Date().toISOString(),
  };
  writeChats(chats);
}

/**
 * Appends a message and bumps updatedAt. Skips the transient 'welcome' pseudo-
 * message — those are UI-only and never persisted.
 */
export function appendMessage(chatId: string, message: Message): void {
  if (message.id === 'welcome') return;
  const chats = getAllChats();
  const idx = chats.findIndex((c) => c.id === chatId);
  if (idx === -1) return;
  // Guard against re-appending the same message ID (e.g. after streaming completes twice)
  if (chats[idx].messages.some((m) => m.id === message.id)) {
    // Replace instead — the pre-seeded assistant message gets updated with its final content
    chats[idx] = {
      ...chats[idx],
      messages: chats[idx].messages.map((m) => (m.id === message.id ? message : m)),
      updatedAt: new Date().toISOString(),
    };
  } else {
    chats[idx] = {
      ...chats[idx],
      messages: [...chats[idx].messages, message],
      updatedAt: new Date().toISOString(),
    };
  }
  writeChats(chats);
}

/**
 * Replace just the descriptor portion of the title (after " · "). Keeps the
 * date prefix so titles stay chronologically legible.
 */
export function setChatTitle(chatId: string, descriptor: string): void {
  const chats = getAllChats();
  const idx = chats.findIndex((c) => c.id === chatId);
  if (idx === -1) return;
  const current = chats[idx].title;
  const sep = ' · ';
  const dotIdx = current.indexOf(sep);
  const datePrefix = dotIdx >= 0 ? current.slice(0, dotIdx) : formatDate(new Date());
  chats[idx] = {
    ...chats[idx],
    title: `${datePrefix}${sep}${descriptor.trim() || 'New chat'}`,
    updatedAt: new Date().toISOString(),
  };
  writeChats(chats);
}

/**
 * Removes a chat. If it was the active chat, promote the newest remaining
 * chat to active, or clear active if none remain.
 */
export function deleteChat(chatId: string): void {
  const chats = getAllChats();
  const remaining = chats.filter((c) => c.id !== chatId);
  writeChats(remaining);
  if (getActiveChatId() === chatId) {
    setActiveChatId(remaining[0]?.id ?? null);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for very old runtimes (should never hit in practice)
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function formatDate(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}`;
}
