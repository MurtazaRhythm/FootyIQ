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

  // respect prefers-reduced-motion: skip the particle animation entirely
  if (!mounted || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return null;

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
  const [largeText, setLargeText] = useState(false);
  // global auto-speak for replies; off by default to protect TTS quota.
  // Voice-initiated questions always speak regardless (hands-free loop).
  const [voiceReplies, setVoiceReplies] = useState(false);

  // Tailwind sizes are rem-based, so scaling the root font-size scales the
  // whole UI proportionally (F7 larger-text toggle)
  useEffect(() => {
    document.documentElement.style.fontSize = largeText ? "20px" : "";
  }, [largeText]);
  const { messages, pipelineState, sendMessage, sendHype, resetChat } =
    useChat(persona, language, voiceReplies);

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
          largeText={largeText}
          voiceReplies={voiceReplies}
          onPersonaChange={setPersona}
          onLanguageChange={setLanguage}
          onLargeTextToggle={() => setLargeText((v) => !v)}
          onVoiceRepliesToggle={() => setVoiceReplies((v) => !v)}
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
