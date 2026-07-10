'use client';

import { ServiceStatus } from '@/types';

interface AppHeaderProps {
  services?: ServiceStatus[];
  /** Mobile hamburger toggle — omitted → button hidden entirely. */
  onOpenSidebar?: () => void;
}

const DEFAULT_SERVICES: ServiceStatus[] = [
  { name: 'weather', status: 'mock', label: 'Weather' },
  { name: 'tides', status: 'mock', label: 'Tides' },
  { name: 'location', status: 'mock', label: 'Location' },
];

export default function AppHeader({ services = DEFAULT_SERVICES, onOpenSidebar }: AppHeaderProps) {
  const statusColor: Record<ServiceStatus['status'], string> = {
    connected: 'bg-emerald-400',
    mock: 'bg-amber-400',
    error: 'bg-red-400',
  };

  const statusLabel: Record<ServiceStatus['status'], string> = {
    connected: 'Live',
    mock: 'Mock',
    error: 'Error',
  };

  return (
    <div className="flex-shrink-0 border-b border-ocean-600/30 bg-ocean-800/40 backdrop-blur-sm">
      {/* Main header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger — only rendered when we have a handler */}
          {onOpenSidebar && (
            <button
              onClick={onOpenSidebar}
              aria-label="Open chat list"
              className="md:hidden w-8 h-8 rounded-lg border border-ocean-600/40 bg-ocean-700/30
                         hover:bg-ocean-600/40 flex items-center justify-center
                         text-ocean-200/80 hover:text-ocean-50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}

          {/* Logo mark */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-wave-500/20 to-ocean-500/40 border border-wave-500/20 flex items-center justify-center shadow-inner animate-wave-bob">
            <span className="text-xl">🎣</span>
          </div>
          <div>
            <h1 className="text-white font-semibold tracking-wide text-base leading-none">
              CAST<span className="text-wave-400"> AI</span>
            </h1>
            <p className="text-ocean-400/70 text-xs mt-0.5 font-light">
              Your AI Fishing Intelligence Platform
            </p>
          </div>
        </div>
      </div>

      {/* Service status bar */}
      <div className="flex items-center gap-1 px-5 pb-3">
        {services.map((service) => (
          <div
            key={service.name}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ocean-700/30 border border-ocean-600/30"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusColor[service.status]} ${service.status === 'connected' ? 'animate-pulse' : ''}`} />
            <span className="text-xs text-ocean-300/60 font-light">
              {service.label}
            </span>
            <span className={`text-xs font-medium ${service.status === 'connected' ? 'text-emerald-400' : service.status === 'mock' ? 'text-amber-400/80' : 'text-red-400'}`}>
              {statusLabel[service.status]}
            </span>
          </div>
        ))}
        <span className="ml-auto text-xs text-ocean-500/40 italic">Phase 3</span>
      </div>
    </div>
  );
}
