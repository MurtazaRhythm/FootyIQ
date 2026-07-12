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
    <header className="fixed top-0 inset-x-0 z-20 animate-fade-down">
      <nav className="relative flex items-center w-full h-14 bg-transparent">
        <div className="flex items-center justify-between gap-2 sm:gap-3 w-full max-w-3xl mx-auto px-3 sm:px-6">

        {/* during a chat the logo doubles as a home button (confirmed in App) */}
        <button
          onClick={onHomeClick}
          disabled={!isActive}
          className={`group flex items-center gap-2.5 shrink-0 ${
            isActive ? "cursor-pointer" : "cursor-default"
          }`}
          aria-label={isActive ? "Back to home" : "Pitchside"}
        >
          <img
            src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
            alt="Pitchside"
            className="w-11 h-11 sm:w-14 sm:h-14 object-contain"
          />
        </button>

        <div className="flex items-center gap-2">
          <Dropdown
            value={persona}
            options={PERSONA_OPTIONS}
            onChange={onPersonaChange}
            compactOnMobile
            ariaLabel="Knowledge level"
          />
          <span className="hidden sm:block w-px h-4 bg-primary/10" aria-hidden />
          <Dropdown
            value={language}
            options={LANGUAGE_OPTIONS}
            onChange={onLanguageChange}
            triggerIcon={<Globe size={15} />}
            compactOnMobile
            ariaLabel="Language"
          />
          <span className="hidden sm:block w-px h-4 bg-primary/10" aria-hidden />
          <button
            onClick={onThemeToggle}
            className="glass-chip flex items-center justify-center w-[34px] h-[34px] rounded-md text-muted hover:text-primary"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
        </div>
      </nav>
    </header>
  );
}
