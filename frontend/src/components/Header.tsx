import { Armchair, Gamepad2, Glasses, Globe, Moon, Sun } from "lucide-react";
import Dropdown from "@/components/ui/dropdown";
import type { DropdownOption } from "@/components/ui/dropdown";
import type { Language, Persona, Theme } from "@/lib/types";

interface HeaderProps {
  isActive: boolean;
  persona: Persona;
  language: Language;
  theme: Theme;
  onPersonaChange: (p: Persona) => void;
  onLanguageChange: (l: Language) => void;
  onThemeToggle: () => void;
  onHomeClick: () => void;
}

const PERSONA_OPTIONS: DropdownOption<Persona>[] = [
  { id: "new-fan", label: "Never watched", icon: <Armchair size={15} /> },
  { id: "casual", label: "Play FIFA", icon: <Gamepad2 size={15} /> },
  { id: "tactics-nerd", label: "Tactics Nerd", icon: <Glasses size={15} /> },
];

const LANGUAGE_OPTIONS: DropdownOption<Language>[] = [
  { id: "en", label: "English" },
  { id: "fr", label: "Français" },
  { id: "es", label: "Español" },
];

export default function Header({
  isActive,
  persona,
  language,
  theme,
  onPersonaChange,
  onLanguageChange,
  onThemeToggle,
  onHomeClick,
}: HeaderProps) {
  return (
    <header className="fixed top-3 inset-x-3 z-20 flex justify-center pointer-events-none animate-fade-down">
      <nav className="glass-panel glass-panel-glow pointer-events-auto relative flex items-center justify-between gap-3 w-full max-w-3xl h-12 pl-4 pr-2 rounded-lg">
        {/* sweeping sheen, clipped to the panel's rounded corners */}
        <span className="glass-panel-sheen" aria-hidden />
        {/* top hairline highlight, gives the glass a lit edge */}
        <span className="glass-hairline" aria-hidden />

        {/* during a chat the logo doubles as a home button (confirmed in App) */}
        <button
          onClick={onHomeClick}
          disabled={!isActive}
          className={`group flex items-center gap-2.5 shrink-0 ${
            isActive ? "cursor-pointer" : "cursor-default"
          }`}
          aria-label={isActive ? "Back to home" : "Pitchside"}
        >
          <span
            className={`w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_rgba(99,102,241,0.8)] ${
              isActive
                ? "group-hover:shadow-[0_0_14px_3px_rgba(99,102,241,0.7)] transition-shadow"
                : ""
            }`}
          />
          <span
            className={`text-sm font-semibold tracking-tight transition-colors ${
              isActive ? "group-hover:text-accent" : ""
            }`}
          >
            Pitchside
          </span>
        </button>

        <div className="flex items-center gap-2">
          <Dropdown
            value={persona}
            options={PERSONA_OPTIONS}
            onChange={onPersonaChange}
            ariaLabel="Knowledge level"
          />
          <span className="w-px h-4 bg-primary/10" aria-hidden />
          <Dropdown
            value={language}
            options={LANGUAGE_OPTIONS}
            onChange={onLanguageChange}
            triggerIcon={<Globe size={15} />}
            ariaLabel="Language"
          />
          <span className="w-px h-4 bg-primary/10" aria-hidden />
          <button
            onClick={onThemeToggle}
            className="glass-chip flex items-center justify-center w-[34px] h-[34px] rounded-md text-muted hover:text-primary"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </nav>
    </header>
  );
}
