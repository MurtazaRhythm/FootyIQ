import { useEffect, useState } from "react";
import NeuralBackground from "@/components/ui/flow-field-background";
import Header from "@/components/Header";
import ChatPanel from "@/components/ChatPanel";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useChat } from "@/hooks/useChat";
import { useWindowSize } from "@/hooks/useWindowSize";
import type { Language, Persona, Theme } from "@/lib/types";

/** Landing: full coverage. Chat: dimmed, masked to corners/edges only. */
function LandingBackground({ visible, theme }: { visible: boolean; theme: Theme }) {
  const { width } = useWindowSize();
  const particleCount = width < 640 ? 300 : 600;

  return (
    <div
      className="fixed inset-0 transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0.5,
        maskImage: visible
          ? "none"
          : "radial-gradient(ellipse 55% 55% at 50% 50%, transparent 40%, black 100%)",
        WebkitMaskImage: visible
          ? "none"
          : "radial-gradient(ellipse 55% 55% at 50% 50%, transparent 40%, black 100%)",
      }}
      aria-hidden
    >
      <NeuralBackground
        color={theme === "light" ? "#4f46e5" : "#6366f1"}
        backgroundRgb={theme === "light" ? "246, 246, 248" : "0, 0, 0"}
        particleCount={particleCount}
      />
    </div>
  );
}

export default function App() {
  const [persona, setPersona] = useState<Persona>("new-fan");
  const [language, setLanguage] = useState<Language>("en");
  const [confirmingHome, setConfirmingHome] = useState(false);
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
  );

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
          onThemeToggle={() =>
            setTheme((t) => (t === "dark" ? "light" : "dark"))
          }
          onHomeClick={() => setConfirmingHome(true)}
        />
        <ChatPanel
          isActive={isActive}
          messages={messages}
          pipelineState={pipelineState}
          language={language}
          persona={persona}
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
