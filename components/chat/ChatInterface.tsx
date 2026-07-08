'use client';

import { useEffect, useRef, useState } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import LocationEntry from './LocationEntry';
import ManualLocationBanner from './ManualLocationBanner';
import AppHeader from '@/components/ui/AppHeader';
import { useChat } from '@/hooks/useChat';
import {
  getCurrentLocation,
  LocationPermissionError,
} from '@/services/location/locationService';
import { LocationData } from '@/types';

type LocationStatus = 'resolving' | 'ready' | 'needs-manual';

export default function ChatInterface() {
  const [location, setLocation]             = useState<LocationData | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('resolving');

  const { messages, isLoading, sendMessage, clearMessages } = useChat(location);
  const bottomRef          = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ── Attempt browser geolocation on mount ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loc = await getCurrentLocation();
        if (!cancelled) {
          setLocation(loc);
          setLocationStatus('ready');
        }
      } catch (err) {
        void err;
        if (!cancelled) {
          setLocationStatus('needs-manual');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleManualLocation = (loc: LocationData) => {
    setLocation(loc);
    setLocationStatus('ready');
  };

  // ── Auto-scroll on new content ──────────────────────────────────────────────
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 160;
    if (isNearBottom || isLoading) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isLoading]);

  const lastMsg = messages[messages.length - 1];
  const streamingMessageId =
    isLoading && lastMsg?.role === 'assistant' ? lastMsg.id : null;
  const showTypingIndicator =
    isLoading && (messages.length === 0 || lastMsg?.role !== 'assistant');

  const showManualBanner = location?.precise === false;
  const showLocationEntry = locationStatus === 'needs-manual' && !location;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden rounded-2xl border border-ocean-600/30 bg-ocean-800/50 backdrop-blur-xl shadow-ocean-glow">
      {/* Header */}
      <AppHeader onClear={clearMessages} />

      {/* Manual-location banner (subtle, always-visible while in manual mode) */}
      {showManualBanner && <ManualLocationBanner />}

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

      {/* Footer: either the location entry form or the chat input */}
      {showLocationEntry
        ? <LocationEntry onLocationSet={handleManualLocation} />
        : <ChatInput onSend={sendMessage} isLoading={isLoading} />}
    </div>
  );
}
