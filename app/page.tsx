import ChatInterface from '@/components/chat/ChatInterface';

export default function Home() {
  return (
    <>
      {/* Animated ocean depth background */}
      <div className="ocean-bg" aria-hidden="true" />

      {/* Full-viewport centering wrapper */}
      <main className="relative z-10 flex items-center justify-center w-full h-full p-4 sm:p-6">
        {/* Glow halo behind the chat window */}
        <div
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{
            width: '900px',
            height: '700px',
            background:
              'radial-gradient(ellipse at center, rgba(37,99,235,0.08) 0%, rgba(6,182,212,0.04) 40%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        {/* Chat window */}
        <div className="chat-container relative">
          <ChatInterface />
        </div>
      </main>
    </>
  );
}
