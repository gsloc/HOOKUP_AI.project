'use client';

export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-up">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-ocean-600 to-ocean-500 flex items-center justify-center text-sm shadow-lg">
        🎣
      </div>
      <div className="bg-ocean-700/80 border border-ocean-600/40 rounded-2xl rounded-tl-sm px-4 py-3 shadow-message-bot">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-wave-400/70"
              style={{
                animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
