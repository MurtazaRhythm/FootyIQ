import { PERSONAS, LANGUAGES } from "@/lib/types";
import type { Language, Persona } from "@/lib/types";

interface HeaderProps {
  isActive: boolean;
  persona: Persona;
  language: Language;
  onPersonaChange: (p: Persona) => void;
  onLanguageChange: (l: Language) => void;
}

export default function Header({
  isActive,
  persona,
  language,
  onPersonaChange,
  onLanguageChange,
}: HeaderProps) {
  return (
    <header className="fixed top-0 inset-x-0 z-20 h-14 flex items-center justify-between px-4 border-b border-border bg-bg/60 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-accent" />
        <span className="text-base font-semibold tracking-tight">FootyIQ</span>
      </div>

      {/* persona and language collapse into compact header chips after first message */}
      {isActive && (
        <div className="flex items-center gap-2 overflow-x-auto">
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
        </div>
      )}
    </header>
  );
}
