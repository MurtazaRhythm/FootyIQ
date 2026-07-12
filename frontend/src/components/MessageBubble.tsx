import type { Language, Message, Persona } from "@/lib/types";
import { INTENSITY_CARD_LABEL } from "@/lib/types";
import AudioPlayer from "@/components/AudioPlayer";
import PitchDiagram from "@/components/PitchDiagram";
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

// T3: each coach carries a signature color, used only on the avatar ring
// and name tint so the glass identity stays dominant
const COACH = {
  "tactics-nerd": { src: pepAvatar,  name: "El Maestro",      position: "50% 10%", color: "#2dd4bf" },
  "new-fan":      { src: pochAvatar, name: "El Pocho",         position: "50% 15%", color: "#38bdf8" },
  "casual":       { src: joseAvatar, name: "The Special One",  position: "50% 15%", color: "#ef4444" },
} satisfies Record<
  Persona,
  { src: string; name: string; position: string; color: string }
>;

// T2: football-native intensity cues — a yellow card for building drama,
// a red card for explosive moments (calm shows nothing). Fixes D3.
function IntensityCard({
  intensity,
  language,
}: {
  intensity: "building" | "explosive";
  language: Language;
}) {
  return (
    <span
      className="inline-block h-[13px] w-[9px] rounded-[2px] rotate-6"
      style={{
        backgroundColor: intensity === "building" ? "#facc15" : "#dc2626",
      }}
      title={INTENSITY_CARD_LABEL[language][intensity]}
      role="img"
      aria-label={INTENSITY_CARD_LABEL[language][intensity]}
    />
  );
}

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
          className="w-16 h-16 rounded-xl object-cover border-2"
          style={{ objectPosition: coach.position, borderColor: coach.color }}
        />
        <span
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: coach.color, opacity: 0.85 }}
        >
          {coach.name}
        </span>
        {(intensity === "building" || intensity === "explosive") && (
          <IntensityCard intensity={intensity} language={language} />
        )}
      </div>
      <div className="max-w-[85%]">
        <p className="text-sm leading-7 whitespace-pre-wrap text-primary/90">
          {renderText(message.text)}
        </p>
        {message.diagram && message.diagram.players.length > 0 && (
          <PitchDiagram diagram={message.diagram} />
        )}
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
            segments={message.segments}
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
