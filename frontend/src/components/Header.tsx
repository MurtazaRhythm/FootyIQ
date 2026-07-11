import { ALargeSmall, Volume2, VolumeX } from "lucide-react";
import { PERSONAS, LANGUAGES } from "@/lib/types";
import type { Language, Persona } from "@/lib/types";

interface HeaderProps {
  isActive: boolean;
  persona: Persona;
  language: Language;
  largeText: boolean;
  voiceReplies: boolean;
  onPersonaChange: (p: Persona) => void;
  onLanguageChange: (l: Language) => void;
  onLargeTextToggle: () => void;
  onVoiceRepliesToggle: () => void;
  onHomeClick: () => void;
}

export default function Header({
  isActive,
  persona,
  language,
  largeText,
  voiceReplies,
  onPersonaChange,
  onLanguageChange,
  onLargeTextToggle,
  onVoiceRepliesToggle,
  onHomeClick,
}: HeaderProps) {
  return (
    <header className="fixed top-0 inset-x-0 z-20 h-14 flex items-center justify-between px-4 border-b border-border bg-bg/60 backdrop-blur-md">
      {/* during a chat the logo doubles as a home button (confirmed in App) */}
      <button
        onClick={onHomeClick}
        disabled={!isActive}
        className={`flex items-center gap-2 ${
          isActive ? "cursor-pointer hover:opacity-80 transition-opacity" : "cursor-default"
        }`}
        aria-label={isActive ? "Back to home" : "FootyIQ"}
      >
        <span className="w-2 h-2 rounded-full bg-accent" />
        <span className="text-base font-semibold tracking-tight">FootyIQ</span>
      </button>

      <div className="flex items-center gap-2 overflow-x-auto">
        <button
          onClick={onVoiceRepliesToggle}
          className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-full border transition-colors ${
            voiceReplies
              ? "border-accent/60 bg-accent/10 text-accent"
              : "border-border bg-surface text-muted hover:text-primary"
          }`}
          aria-pressed={voiceReplies}
          aria-label="Toggle spoken replies"
          title={voiceReplies ? "Spoken replies: on" : "Spoken replies: off"}
        >
          {voiceReplies ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <button
          onClick={onLargeTextToggle}
          className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-full border transition-colors ${
            largeText
              ? "border-accent/60 bg-accent/10 text-accent"
              : "border-border bg-surface text-muted hover:text-primary"
          }`}
          aria-pressed={largeText}
          aria-label="Toggle larger text"
          title="Larger text"
        >
          <ALargeSmall size={18} />
        </button>

        {/* persona and language collapse into compact header chips after first message */}
        {isActive && (
          <>
          <div className="flex items-center gap-1 rounded-full border border-border bg-surface p-1">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                onClick={() => onPersonaChange(p.id)}
                className={`px-3 h-7 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  p.id === persona
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:text-primary"
                }`}
                aria-pressed={p.id === persona}
              >
                {p.label}
              </button>
            ))}
          </div>
            <div className="flex items-center gap-1 rounded-full border border-border bg-surface p-1">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                onClick={() => onLanguageChange(l.id)}
                className={`px-3 h-7 rounded-full text-xs font-mono font-medium transition-colors ${
                  l.id === language
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:text-primary"
                }`}
                aria-pressed={l.id === language}
              >
                {l.label}
              </button>
            ))}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
