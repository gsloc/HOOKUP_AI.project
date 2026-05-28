'use client';

import { Message } from '@/types';

interface ChatMessageProps {
  message: Message;
  /** True while this message is actively receiving stream chunks. */
  isStreaming?: boolean;
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule
    if (line.trim() === '---') {
      elements.push(<hr key={key++} className="border-ocean-600/40 my-3" />);
      i++;
      continue;
    }

    // H2 headers
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={key++} className="text-wave-300 font-semibold text-sm mt-4 mb-1 first:mt-0">
          {inlineFormat(line.slice(3))}
        </h3>,
      );
      i++;
      continue;
    }

    // H3 headers
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={key++} className="text-ocean-100 font-semibold text-sm mt-3 mb-1">
          {inlineFormat(line.slice(4))}
        </h4>,
      );
      i++;
      continue;
    }

    // Bullet lists — collect consecutive bullet lines
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('• '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={key++} className="list-none space-y-1 my-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-ocean-100/90">
              <span className="text-wave-400 mt-0.5 flex-shrink-0">›</span>
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      elements.push(<div key={key++} className="h-1.5" />);
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className="text-sm leading-relaxed text-ocean-50/90">
        {inlineFormat(line)}
      </p>,
    );
    i++;
  }

  return elements;
}

function inlineFormat(text: string): React.ReactNode {
  // Process bold+italic, bold, italic, inline code
  const parts = text.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('***') && part.endsWith('***')) {
      return <strong key={i} className="font-bold italic text-wave-300">{part.slice(3, -3)}</strong>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic text-ocean-200">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-ocean-800 text-wave-300 px-1 py-0.5 rounded text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    // Handle emoji indicators like 🎣, 🌊 etc — pass through unchanged
    return <span key={i}>{part}</span>;
  });
}

export default function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const timeString = message.timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isUser) {
    return (
      <div className="flex items-end justify-end gap-2 animate-fade-up">
        <div className="max-w-[78%] sm:max-w-[65%]">
          <div className="bg-gradient-to-br from-ocean-500 to-ocean-600 border border-ocean-400/30 rounded-2xl rounded-br-sm px-4 py-3 shadow-message-user">
            <p className="text-sm text-white/95 leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
          <p className="text-right text-xs text-ocean-400/60 mt-1 pr-1">{timeString}</p>
        </div>
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-ocean-500/40 border border-ocean-400/30 flex items-center justify-center text-xs mb-5">
          👤
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 animate-fade-up">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-ocean-600 to-ocean-500 border border-wave-500/20 flex items-center justify-center text-sm shadow-lg flex-none mt-0.5">
        🎣
      </div>
      <div className="max-w-[85%] sm:max-w-[80%]">
        <div className="bg-ocean-700/60 border border-ocean-600/40 rounded-2xl rounded-tl-sm px-4 py-3 shadow-message-bot backdrop-blur-sm">
          <div className="space-y-0.5">
            {message.content ? renderMarkdown(message.content) : null}
            {isStreaming && (
              <span
                aria-hidden="true"
                className="inline-block text-wave-400/80 text-sm leading-none"
                style={{ animation: 'blink 0.85s step-end infinite' }}
              >
                ▋
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-ocean-400/60 mt-1 pl-1">{timeString}</p>
      </div>
    </div>
  );
}
