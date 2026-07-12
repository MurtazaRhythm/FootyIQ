import type { Language, Message, Persona } from "@/lib/types";
import AudioPlayer from "@/components/AudioPlayer";
import pepAvatar from "/pep.jpg";
import joseAvatar from "/jose.jpg";
import pochAvatar from "/pochh.jpg";

interface MessageBubbleProps {
  message: Message;
  language: Language;
  persona: Persona;
  /** voice mode: auto-speak this message when it arrives */
  autoPlayAudio?: boolean;
  onAudioPlaying?: (playing: boolean) => void;
  stopSignal?: number;
}

const COACH = {
  "tactics-nerd": { src: pepAvatar,  name: "El Maestro",      position: "50% 10%" },
  "new-fan":      { src: pochAvatar, name: "El Pocho",         position: "50% 15%" },
  "casual":       { src: joseAvatar, name: "The Special One",  position: "50% 15%" },
} satisfies Record<Persona, { src: string; name: string; position: string }>;

function renderText(text: string) {
  return text.split(/(\*\*.*?\*\*)/g).map((chunk, i) =>
    chunk.startsWith("**") && chunk.endsWith("**")
      ? <strong key={i}>{chunk.slice(2, -2)}</strong>
      : chunk
  );
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
  persona,
  autoPlayAudio = false,
  onAudioPlaying,
  stopSignal,
}: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="group flex flex-col items-end gap-1 animate-fade-up">
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
  const coach = COACH[message.persona ?? persona];

  return (
    <div className="group flex flex-col items-start gap-1 animate-fade-up">
      <div key={persona} className="flex items-center gap-2 pl-0.5 animate-fade-in">
        <img
          src={coach.src}
          alt={coach.name}
          className="w-16 h-16 rounded-xl object-cover"
          style={{ objectPosition: coach.position }}
        />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
          {coach.name}
        </span>
      </div>
      <div className="max-w-[85%]">
        <p className="text-sm leading-7 whitespace-pre-wrap text-primary/90">
          {renderText(message.text)}
        </p>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/50 pt-2">
            <span className="text-[11px] font-mono text-muted">sources</span>
            {message.sources.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-accent/80 hover:text-accent underline underline-offset-2 truncate max-w-[16rem]"
                title={s.title}
              >
                {s.title}
              </a>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4">
          <AudioPlayer
            text={message.text}
            intensity={intensity}
            language={language}
            persona={message.persona ?? persona}
            autoPlay={autoPlayAudio}
            createdAt={message.timestamp}
            onPlayingChange={onAudioPlaying}
            stopSignal={stopSignal}
          />
          <span className="text-[11px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}
