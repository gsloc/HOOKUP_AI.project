'use client';

export default function ManualLocationBanner() {
  return (
    <div className="flex-shrink-0 border-b border-ocean-600/20 bg-ocean-800/30 px-4 py-1.5">
      <p className="text-[11px] text-ocean-300/60 leading-snug text-center">
        Manual location. Enable browser location and refresh for more accurate recommendations.
      </p>
    </div>
  );
}
