import { useEffect, useState } from "react";
import NeuralBackground from "@/components/ui/flow-field-background";
import Header from "@/components/Header";
import ChatPanel from "@/components/ChatPanel";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useChat } from "@/hooks/useChat";
import { useWindowSize } from "@/hooks/useWindowSize";
import type { Language, Persona, Theme } from "@/lib/types";

/** Full on landing; edges-only during chat via a radial mask (no transition on mask). */
function LandingBackground({ visible, theme }: { visible: boolean; theme: Theme }) {
  const { width } = useWindowSize();
  const particleCount = width < 640 ? 300 : 600;

  return (
    <div
      className="fixed inset-0"
      style={{
        maskImage: visible
          ? "none"
          : "radial-gradient(ellipse 50% 60% at 50% 50%, transparent 35%, black 80%)",
        WebkitMaskImage: visible
          ? "none"
          : "radial-gradient(ellipse 50% 60% at 50% 50%, transparent 35%, black 80%)",
      }}
      aria-hidden
    >
      <NeuralBackground
        color={theme === "light" ? "#4f46e5" : "#6366f1"}
        backgroundRgb={theme === "light" ? "246, 246, 248" : "0, 0, 0"}
        particleCount={particleCount}
        speed={0.2}
      />
    </div>
  );
}

export default function App() {
  const [persona, setPersona] = useState<Persona>("new-fan");
  const [language, setLanguage] = useState<Language>("en");
  const [confirmingHome, setConfirmingHome] = useState(false);
  // spoken replies are on by default; the waveform toggle mutes them
  const [voiceMode, setVoiceMode] = useState(
    () => localStorage.getItem("voiceMode") !== "0",
  );
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme) ?? "dark",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "light" ? "#F6F6F8" : "#0A0A0B");

  }, [theme]);

  const { messages, pipelineState, sendMessage, sendHype, resetChat } = useChat(
    persona,
    language,
    voiceMode,
  );

  const toggleVoiceMode = () => {
    setVoiceMode((v) => {
      localStorage.setItem("voiceMode", v ? "0" : "1");
      return !v;
    });
  };

  const isActive = messages.length > 0;

  const goHome = () => {
    resetChat();
    setConfirmingHome(false);
  };

  return (
    <div className="fixed inset-0">
      <LandingBackground visible={!isActive} theme={theme} />
      <div className="relative h-full">
        <Header
          isActive={isActive}
          persona={persona}
          language={language}
          theme={theme}
          onPersonaChange={setPersona}
          onLanguageChange={setLanguage}
          onThemeToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          onHomeClick={() => setConfirmingHome(true)}
        />
        <ChatPanel
          isActive={isActive}
          messages={messages}
          pipelineState={pipelineState}
          language={language}
          persona={persona}
          voiceMode={voiceMode}
          onVoiceModeToggle={toggleVoiceMode}
          onSend={sendMessage}
          onHype={sendHype}
        />
      </div>
      <ConfirmDialog
        open={confirmingHome}
        title="Leave this conversation?"
        body="Going back to the homepage will clear the current chat. This can't be undone."
        confirmLabel="Go home"
        cancelLabel="Stay"
        onConfirm={goHome}
        onCancel={() => setConfirmingHome(false)}
      />
    </div>
  );
}
