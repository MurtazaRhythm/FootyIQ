import { useEffect, useState } from "react";
import NeuralBackground from "@/components/ui/flow-field-background";
import Header from "@/components/Header";
import ChatPanel from "@/components/ChatPanel";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useChat } from "@/hooks/useChat";
import { useWindowSize } from "@/hooks/useWindowSize";
import type { Language, Persona } from "@/lib/types";

/** Fades the particle field out on first message, then unmounts it so the
 *  animation loop stops burning frames behind the chat. */
function LandingBackground({ visible }: { visible: boolean }) {
  const [mounted, setMounted] = useState(visible);
  const { width } = useWindowSize();

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), 700);
    return () => window.clearTimeout(t);
  }, [visible]);

  if (!mounted) return null;

  // keep 60fps on phones
  const particleCount = width < 640 ? 300 : 600;

  return (
    <div
      className={`fixed inset-0 transition-opacity duration-700 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden
    >
      <NeuralBackground color="#00e58c" particleCount={particleCount} />
    </div>
  );
}

export default function App() {
  const [persona, setPersona] = useState<Persona>("new-fan");
  const [language, setLanguage] = useState<Language>("en");
  const [confirmingHome, setConfirmingHome] = useState(false);
  const { messages, pipelineState, sendMessage, resetChat } = useChat(
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
      <LandingBackground visible={!isActive} />
      <div className="relative h-full">
        <Header
          isActive={isActive}
          persona={persona}
          language={language}
          onPersonaChange={setPersona}
          onLanguageChange={setLanguage}
          onHomeClick={() => setConfirmingHome(true)}
        />
        <ChatPanel
          isActive={isActive}
          messages={messages}
          pipelineState={pipelineState}
          persona={persona}
          language={language}
          onPersonaChange={setPersona}
          onLanguageChange={setLanguage}
          onSend={sendMessage}
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
