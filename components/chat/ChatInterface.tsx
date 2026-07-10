'use client';

import { useEffect, useRef, useState } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import LocationEntry from './LocationEntry';
import ManualLocationBanner from './ManualLocationBanner';
import ChatSidebar from './ChatSidebar';
import AppHeader from '@/components/ui/AppHeader';
import { useChat } from '@/hooks/useChat';
import {
  getCurrentLocation,
  LocationPermissionError,
} from '@/services/location/locationService';
import {
  getActiveChatId,
  getChat,
  createChat,
  setActiveChatId,
} from '@/services/storage/chatStorage';
import { LocationData, ServiceStatus } from '@/types';

type LocationStatus = 'resolving' | 'ready' | 'needs-manual';
type LivePillStatus = ServiceStatus['status']; // 'connected' | 'mock' | 'error'

export default function ChatInterface() {
  // ── Location state ─────────────────────────────────────────────────────────
  const [location, setLocation]             = useState<LocationData | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('resolving');

  // ── Service-status pills (session-scoped, not per-chat) ────────────────────
  const [weatherPill, setWeatherPill] = useState<LivePillStatus>('mock');
  const [tidesPill, setTidesPill]     = useState<LivePillStatus>('mock');

  // ── Chat lifecycle ─────────────────────────────────────────────────────────
  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen]        = useState(false);

  const { messages, isLoading, sendMessage } = useChat(location, activeChatId);
  const bottomRef          = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ── Mount: resolve the active chat (or create one) ─────────────────────────
  useEffect(() => {
    const existingId = getActiveChatId();
    if (existingId && getChat(existingId)) {
      setActiveChatIdState(existingId);
    } else {
      const fresh = createChat(location ?? undefined);
      setActiveChatIdState(fresh.id);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hookup:chats-changed'));
      }
    }
    // Only run once at mount — location may still be resolving here, and that's fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Attempt browser geolocation on mount ───────────────────────────────────
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
        if (!cancelled) setLocationStatus('needs-manual');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleManualLocation = (loc: LocationData) => {
    setLocation(loc);
    setLocationStatus('ready');
  };

  // ── Health-check pings (session-scoped) ────────────────────────────────────
  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/weather/current?latitude=${location.lat}&longitude=${location.lng}`,
        );
        if (cancelled) return;
        setWeatherPill(res.ok ? 'connected' : 'error');
      } catch {
        if (!cancelled) setWeatherPill('error');
      }
    })();
    return () => { cancelled = true; };
  }, [location]);

  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    (async () => {
      try {
        const stationRes = await fetch(
          `/api/tides/nearest-station?latitude=${location.lat}&longitude=${location.lng}`,
        );
        if (cancelled) return;
        if (!stationRes.ok) { setTidesPill('error'); return; }
        const station = await stationRes.json();

        const predRes = await fetch(
          `/api/tides/predictions?stationId=${encodeURIComponent(station.id)}` +
          `&stationName=${encodeURIComponent(station.name)}`,
        );
        if (cancelled) return;
        setTidesPill(predRes.ok ? 'connected' : 'error');
      } catch {
        if (!cancelled) setTidesPill('error');
      }
    })();
    return () => { cancelled = true; };
  }, [location]);

  // ── Chat switching handlers ────────────────────────────────────────────────
  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setActiveChatIdState(chatId);
  };

  const handleNewChat = (chatId: string) => {
    // createChat already sets the active-id in storage
    setActiveChatIdState(chatId);
  };

  const headerServices: ServiceStatus[] = [
    { name: 'weather', status: weatherPill, label: 'Weather' },
    { name: 'tides',   status: tidesPill,   label: 'Tides' },
    {
      name: 'location',
      status: location ? 'connected' : 'mock',
      label: 'Location',
    },
  ];

  // ── Auto-scroll on new content ─────────────────────────────────────────────
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
    <div className="flex h-full w-full overflow-hidden rounded-2xl border border-ocean-600/30 bg-ocean-800/50 backdrop-blur-xl shadow-ocean-glow">
      {/* Left: chat sidebar */}
      <ChatSidebar
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        location={location}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Right: chat column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader
          services={headerServices}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        {showManualBanner && <ManualLocationBanner />}

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

        {showLocationEntry
          ? <LocationEntry onLocationSet={handleManualLocation} />
          : <ChatInput onSend={sendMessage} isLoading={isLoading} />}
      </div>
    </div>
  );
}
