'use client';

import { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import AppHeader from '@/components/ui/AppHeader';
import { useChat } from '@/hooks/useChat';

export default function ChatInterface() {
  const { messages, isLoading, sendMessage, clearMessages } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new content
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 160;
    if (isNearBottom || isLoading) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isLoading]);

  // The last assistant message while loading is the one being streamed into.
  const lastMsg = messages[messages.length - 1];
  const streamingMessageId =
    isLoading && lastMsg?.role === 'assistant' ? lastMsg.id : null;

  // Show the dot-typing indicator only while waiting for the FIRST chunk
  // (i.e. the HTTP request is in-flight but the assistant message hasn't been
  // seeded yet — last message is still the user's turn).
  const showTypingIndicator =
    isLoading && (messages.length === 0 || lastMsg?.role !== 'assistant');

  return (
    <div className="flex flex-col h-full w-full overflow-hidden rounded-2xl border border-ocean-600/30 bg-ocean-800/50 backdrop-blur-xl shadow-ocean-glow">
      {/* Header */}
      <AppHeader onClear={clearMessages} />

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-5 space-y-4 scrollbar-thin"
      >
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            isStreaming={message.id === streamingMessageId}
          />
        ))}

        {showTypingIndicator && <TypingIndicator />}

        <div ref={bottomRef} className="h-px" />
      </div>

      {/* Input */}
      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  );
}
