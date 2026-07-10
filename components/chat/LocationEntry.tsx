'use client';

import { useState, FormEvent } from 'react';
import { LocationData } from '@/types';
import {
  getLocationByPlaceName,
  LocationNotFoundError,
} from '@/services/location/locationService';

interface LocationEntryProps {
  onLocationSet: (location: LocationData) => void;
}

export default function LocationEntry({ onLocationSet }: LocationEntryProps) {
  const [value, setValue]         = useState('');
  const [error, setError]         = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const query = value.trim();
    if (!query || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const location = await getLocationByPlaceName(query);
      onLocationSet(location);
    } catch (err) {
      if (err instanceof LocationNotFoundError) {
        setError("Couldn't find that location. Try a zip code or nearest city.");
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-shrink-0 border-t border-ocean-600/30 bg-ocean-800/40 backdrop-blur-sm">
      <div className="px-5 py-6">
        <div className="mx-auto max-w-md rounded-2xl border border-ocean-600/40 bg-ocean-750/60 backdrop-blur-sm px-5 py-5 shadow-message-bot">
          <h3 className="text-white font-semibold text-base tracking-wide mb-1">
            Where are you fishing?
          </h3>
          <p className="text-ocean-300/70 text-xs leading-relaxed mb-4">
            HOOKUP AI needs your location for accurate weather, tides, and recommendations.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Zip code or place (e.g. 28401 or Wrightsville Beach)"
              autoFocus
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              suppressHydrationWarning={true}
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
              disabled={isLoading}
              className={`
                w-full bg-ocean-800/70 border rounded-xl px-4 py-2.5
                text-sm text-ocean-50 placeholder-ocean-400/40
                focus:outline-none focus:ring-0
                transition-colors duration-200
                ${
                  error
                    ? 'border-red-500/60 focus:border-red-500'
                    : 'border-ocean-600/50 focus:border-wave-500/60 hover:border-ocean-500/60'
                }
                disabled:opacity-50
              `}
            />

            {error && (
              <p className="text-xs text-red-400/90 leading-relaxed">{error}</p>
            )}

            <button
              type="submit"
              disabled={!value.trim() || isLoading}
              className={`
                w-full rounded-xl px-4 py-2.5 text-sm font-medium
                transition-all duration-200
                ${
                  value.trim() && !isLoading
                    ? 'bg-gradient-to-br from-wave-500 to-ocean-400 text-white hover:from-wave-400 hover:to-ocean-300 shadow-md hover:shadow-lg active:scale-[0.98]'
                    : 'bg-ocean-700/50 border border-ocean-600/30 text-ocean-400/50 cursor-not-allowed'
                }
              `}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Setting location…
                </span>
              ) : (
                'Set location'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
