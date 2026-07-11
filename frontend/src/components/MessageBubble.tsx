import type { Language, Message } from "@/lib/types";
import { INTENSITY_COLORS } from "@/lib/types";
import AudioPlayer from "@/components/AudioPlayer";

interface MessageBubbleProps {
  message: Message;
  language: Language;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessageBubble({ message, language }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-md border border-border bg-surface px-4 py-3">
          {message.image && (
            <img
              src={message.image}
              alt="attached"
              className="mb-2 max-h-48 rounded-sm object-cover"
            />
          )}
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
          <p className="mt-1 text-xs font-mono text-muted text-right">
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  const intensity = message.intensity ?? "calm";
  const accentColor = INTENSITY_COLORS[intensity];

  return (
    <div className="flex justify-start">
      <div
        className="max-w-[85%] rounded-md border border-border bg-surface px-4 py-3"
        style={{ borderLeft: `3px solid ${accentColor}` }}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2">
            <span className="text-xs font-mono text-muted">sources</span>
            {message.sources.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent/80 hover:text-accent underline underline-offset-2 truncate max-w-[16rem]"
                title={s.title}
              >
                {s.title}
              </a>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <AudioPlayer
            text={message.text}
            intensity={intensity}
            language={language}
            autoPlay={message.autoSpeak}
          />
          <p className="mt-1 text-xs font-mono text-muted">
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
}
