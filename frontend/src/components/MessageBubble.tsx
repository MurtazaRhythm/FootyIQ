import type { Language, Message } from "@/lib/types";
import { INTENSITY_COLORS } from "@/lib/types";
import AudioPlayer from "@/components/AudioPlayer";

interface MessageBubbleProps {
  message: Message;
  language: Language;
  /** voice mode: auto-speak this message when it arrives */
  autoPlayAudio?: boolean;
  onAudioPlaying?: (playing: boolean) => void;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessageBubble({
  message,
  language,
  autoPlayAudio = false,
  onAudioPlaying,
}: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="group flex flex-col items-end gap-1">
        <div className="max-w-[75%] rounded-2xl rounded-br-md bg-surface border border-border px-4 py-2.5">
          {message.image && (
            <img
              src={message.image}
              alt="attached"
              className="mb-2 max-h-48 rounded-lg object-cover"
            />
          )}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.text}
          </p>
        </div>
        <span className="pr-1 text-[11px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
          {formatTime(message.timestamp)}
        </span>
      </div>
    );
  }

  const intensity = message.intensity ?? "calm";
  const accentColor = INTENSITY_COLORS[intensity];

  /* coach replies render as plain text, no card - just a subtle intensity dot */
  return (
    <div className="group flex flex-col items-start gap-1">
      <div className="flex items-center gap-2 pl-0.5">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: accentColor }}
          aria-hidden
        />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
          Coach
        </span>
      </div>
      <div className="max-w-[85%]">
        <p className="text-sm leading-7 whitespace-pre-wrap text-primary/90">
          {message.text}
        </p>
        <div className="flex items-center gap-4">
          <AudioPlayer
            text={message.text}
            intensity={intensity}
            language={language}
            autoPlay={autoPlayAudio}
            createdAt={message.timestamp}
            onPlayingChange={onAudioPlaying}
          />
          <span className="text-[11px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}
