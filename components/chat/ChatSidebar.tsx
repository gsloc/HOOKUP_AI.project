'use client';

import { useEffect, useState, useCallback } from 'react';
import { Chat, LocationData } from '@/types';
import {
  getAllChats,
  createChat,
  deleteChat,
  setActiveChatId,
} from '@/services/storage/chatStorage';

interface ChatSidebarProps {
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat:    (chatId: string) => void;
  location:     LocationData | null;
  /** Mobile overlay open state — desktop ignores this. */
  isOpen:       boolean;
  onClose:      () => void;
}

export default function ChatSidebar({
  activeChatId,
  onSelectChat,
  onNewChat,
  location,
  isOpen,
  onClose,
}: ChatSidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);

  const refresh = useCallback(() => setChats(getAllChats()), []);

  useEffect(() => {
    refresh();
    if (typeof window === 'undefined') return;

    // Listen for cross-component chat mutations (title generation,
    // sendMessage persisting turns, other tabs modifying storage).
    const onChanged = () => refresh();
    window.addEventListener('hookup:chats-changed', onChanged);
    window.addEventListener('storage', onChanged);
    return () => {
      window.removeEventListener('hookup:chats-changed', onChanged);
      window.removeEventListener('storage', onChanged);
    };
  }, [refresh]);

  // Refresh when the active chat changes — the newly-created chat needs to appear.
  useEffect(() => {
    refresh();
  }, [activeChatId, refresh]);

  const handleNewChat = () => {
    const chat = createChat(location ?? undefined);
    refresh();
    onNewChat(chat.id);
    onClose();
  };

  const handleSelect = (chatId: string) => {
    setActiveChatId(chatId);
    onSelectChat(chatId);
    onClose();
  };

  const handleDelete = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this chat?')) return;
    deleteChat(chatId);
    refresh();
    // If we deleted the active chat, promote the newest remaining (or create fresh)
    if (chatId === activeChatId) {
      const remaining = getAllChats();
      if (remaining.length > 0) {
        setActiveChatId(remaining[0].id);
        onSelectChat(remaining[0].id);
      } else {
        const fresh = createChat(location ?? undefined);
        refresh();
        onNewChat(fresh.id);
      }
    }
    // Notify listeners in case another view is showing this chat
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hookup:chats-changed'));
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-40
          w-64 flex-shrink-0 flex flex-col
          bg-ocean-800 border-r border-ocean-600/30
          p-4
          transition-transform duration-200 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        `}
      >
        {/* New chat button */}
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium
                     bg-gradient-to-br from-wave-500 to-ocean-400 text-white shadow-md
                     hover:from-wave-400 hover:to-ocean-300 active:scale-[0.98]
                     transition-all duration-150"
        >
          <span className="text-lg leading-none">+</span>
          <span>New chat</span>
        </button>

        {/* Chat list */}
        <nav className="flex-1 mt-4 overflow-y-auto scrollbar-thin -mx-1 px-1">
          {chats.length === 0 ? (
            <p className="text-xs text-ocean-400/50 px-2 py-4 italic">No chats yet</p>
          ) : (
            <ul className="space-y-1">
              {chats.map((chat) => (
                <li key={chat.id}>
                  <ChatListItem
                    chat={chat}
                    isActive={chat.id === activeChatId}
                    onSelect={() => handleSelect(chat.id)}
                    onDelete={(e) => handleDelete(e, chat.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </nav>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-ocean-600/20">
          <p className="text-[10px] font-mono uppercase tracking-widest text-ocean-400/60 text-center">
            HOOKUP AI · V1
          </p>
        </div>
      </aside>
    </>
  );
}

// ─── Chat list item ──────────────────────────────────────────────────────────

interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function ChatListItem({ chat, isActive, onSelect, onDelete }: ChatListItemProps) {
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      className={`
        group relative flex items-center gap-2 rounded-lg px-3 py-2
        text-sm cursor-pointer transition-colors duration-100
        ${isActive
          ? 'bg-ocean-700 text-ocean-50 border-l-2 border-wave-400 pl-[10px]'
          : 'text-ocean-200/80 hover:bg-ocean-700/50 hover:text-ocean-50'}
      `}
    >
      <span className="flex-1 truncate">{chat.title}</span>

      {!isActive && (
        <button
          onClick={onDelete}
          title="Delete chat"
          aria-label="Delete chat"
          className="opacity-0 group-hover:opacity-100 focus:opacity-100
                     w-6 h-6 flex-shrink-0 rounded-md flex items-center justify-center
                     text-ocean-400/70 hover:text-red-400 hover:bg-ocean-800/60
                     transition-all duration-100"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1.5 14a2 2 0 01-2 1.8h-7a2 2 0 01-2-1.8L5 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
