import { PERSONAS, LANGUAGES } from "@/lib/types";
import type { Language, Persona } from "@/lib/types";

interface PersonaPickerProps {
  persona: Persona;
  language: Language;
  onPersonaChange: (p: Persona) => void;
  onLanguageChange: (l: Language) => void;
}

export default function PersonaPicker({
  persona,
  language,
  onPersonaChange,
  onLanguageChange,
}: PersonaPickerProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2 overflow-x-auto max-w-full px-4">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            onClick={() => onPersonaChange(p.id)}
            className={`h-11 px-5 rounded-full border text-sm font-medium whitespace-nowrap transition-colors ${
              p.id === persona
                ? "border-accent/60 bg-accent/10 text-accent"
                : "border-border bg-surface text-muted hover:text-primary"
            }`}
            aria-pressed={p.id === persona}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {LANGUAGES.map((l) => (
          <button
            key={l.id}
            onClick={() => onLanguageChange(l.id)}
            className={`h-11 w-14 rounded-full border font-mono text-sm font-medium transition-colors ${
              l.id === language
                ? "border-accent/60 bg-accent/10 text-accent"
                : "border-border bg-surface text-muted hover:text-primary"
            }`}
            aria-pressed={l.id === language}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
