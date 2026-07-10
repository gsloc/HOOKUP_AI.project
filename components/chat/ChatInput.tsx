'use client';

import { useState, useRef, useCallback, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

const SUGGESTIONS = [
  'Best bass technique for post-spawn?',
  'How does a cold front affect fishing?',
  'What lures work in muddy water?',
  'Explain tidal feeding windows',
  'Best time of day for bass?',
];

export default function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue('');
    setShowSuggestions(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, isLoading, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, []);

  const handleSuggestion = (suggestion: string) => {
    setValue(suggestion);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  const charCount = value.length;
  const isOverLimit = charCount > 2000;

  return (
    <div className="flex-shrink-0 border-t border-ocean-600/30 bg-ocean-800/40 backdrop-blur-sm">
      {/* Quick suggestions */}
      {showSuggestions && (
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs text-ocean-400/50 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-ocean-700/50 border border-ocean-600/40 text-ocean-200/70 hover:bg-ocean-600/50 hover:text-ocean-100 hover:border-ocean-500/50 transition-all duration-150"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-3 px-4 py-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask about techniques, conditions, gear, or any fishing question..."
            rows={1}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            suppressHydrationWarning={true}
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            className={`
              w-full resize-none bg-ocean-750/80 border rounded-2xl px-4 py-3 pr-16
              text-sm text-ocean-50 placeholder-ocean-400/40
              focus:outline-none focus:ring-0
              transition-colors duration-200 leading-relaxed
              ${
                isOverLimit
                  ? 'border-red-500/60 focus:border-red-500'
                  : 'border-ocean-600/50 focus:border-wave-500/60 hover:border-ocean-500/60'
              }
            `}
            style={{ minHeight: '46px', maxHeight: '140px' }}
          />
          {/* Char counter */}
          {charCount > 1600 && (
            <span
              className={`absolute right-3 bottom-3 text-xs ${
                isOverLimit ? 'text-red-400' : 'text-ocean-400/60'
              }`}
            >
              {charCount}/2000
            </span>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!value.trim() || isLoading || isOverLimit}
          aria-label="Send message"
          className={`
            flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center
            transition-all duration-200
            ${
              value.trim() && !isLoading && !isOverLimit
                ? 'bg-gradient-to-br from-wave-500 to-ocean-400 hover:from-wave-400 hover:to-ocean-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95'
                : 'bg-ocean-700/50 border border-ocean-600/30 cursor-not-allowed opacity-40'
            }
          `}
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="translate-x-0.5">
              <path
                d="M22 2L11 13"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 2L15 22L11 13L2 9L22 2Z"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>

      <p className="text-center text-xs text-ocean-500/40 pb-2">
        Enter to send &nbsp;·&nbsp; Shift+Enter for new line
      </p>
    </div>
  );
}
