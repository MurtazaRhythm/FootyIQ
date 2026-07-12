import { useCallback, useRef, useState } from "react";
import type {
  HypeMode,
  Intensity,
  Language,
  Message,
  Persona,
  PipelineState,
  Source,
} from "@/lib/types";
import { HYPE_LABELS, PIPELINE_PHRASES } from "@/lib/types";

interface ChatResponse {
  text: string;
  intensity?: Intensity;
  sources?: Source[];
  diagram?: import("@/lib/types").Diagram | null;
  team?: string | null; // S7: user's stated allegiance
  segments?: import("@/lib/types").Segment[]; // S5 hype script
}


let nextId = 0;
const makeId = () => `msg-${Date.now()}-${nextId++}`;

const LANGUAGE_SWITCH_NOTICE: Record<Language, string> = {
  en: "[The user just switched to English. Respond in English from this point on.]",
  fr: "[L'utilisateur vient de passer en français. Réponds en français à partir de maintenant.]",
  es: "[El usuario acaba de cambiar al español. Responde en español a partir de ahora.]",
};

export function useChat(persona: Persona, language: Language, voiceReplies = false) {
  const [messages, setMessages] = useState<Message[]>([]);
  // S7: the team the user said they support, shown as a chip near the composer
  const [team, setTeam] = useState<string | null>(null);
  const [pipelineState, setPipelineState] = useState<PipelineState | null>(null);
  const pipelineTimers = useRef<number[]>([]);
  const lastLanguageRef = useRef<Language>(language);

  const clearPipeline = () => {
    pipelineTimers.current.forEach((t) => window.clearInterval(t));
    pipelineTimers.current = [];
    setPipelineState(null);
  };

  // T1: rotate broadcast-flavored phrases while waiting on the backend
  const startPipeline = () => {
    const phrases = PIPELINE_PHRASES[language];
    let i = 0;
    setPipelineState(phrases[0]);
    pipelineTimers.current.push(
      window.setInterval(() => {
        i = (i + 1) % phrases.length;
        setPipelineState(phrases[i]);
      }, 2600),
    );
  };

  const sendMessage = useCallback(
    async (text: string, image?: string, opts?: { voice?: boolean }) => {
      const userMessage: Message = {
        id: makeId(),
        role: "user",
        text,
        image,
        timestamp: Date.now(),
      };

      // history is captured before appending so the backend gets prior turns only
      let history: { role: string; text: string }[] = [];
      setMessages((prev) => {
        history = prev.map((m) => ({ role: m.role, text: m.text }));
        return [...prev, userMessage];
      });

      // when the user switches language mid-conversation, inject a marker so
      // Gemini knows to switch even with history in the previous language
      if (lastLanguageRef.current !== language && history.length > 0) {
        history = [...history, { role: "user", text: LANGUAGE_SWITCH_NOTICE[language] }];
      }
      lastLanguageRef.current = language;

      startPipeline();

      try {
        const res = await fetch("/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            persona,
            language,
            image: image ?? null,
            history,
          }),
        });

        if (!res.ok) throw new Error(`chat request failed: ${res.status}`);

        const data: ChatResponse = await res.json();
        if (data.team) setTeam(data.team);
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: "coach",
            text: data.text,
            intensity: data.intensity ?? "calm",
            sources: data.sources ?? [],
            diagram: data.diagram ?? null,
            // spoken when global voice toggle is on; voice-initiated always speak
            autoSpeak: voiceReplies || (opts?.voice ?? false),
            persona,
            timestamp: Date.now(),
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: "coach",
            text: "I couldn't reach the coaching desk. Make sure the backend is running, then try again.",
            intensity: "calm",
            timestamp: Date.now(),
          },
        ]);
      } finally {
        clearPipeline();
      }
    },
    [persona, language, voiceReplies],
  );

  // F9: one-tap hype content — appears in the chat like any other exchange
  const sendHype = useCallback(
    async (team: string, mode: HypeMode) => {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "user",
          text: HYPE_LABELS[language][mode].replace("{team}", team),
          timestamp: Date.now(),
        },
      ]);
      startPipeline();
      try {
        const res = await fetch("/hype", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ team, mode, language }),
        });
        if (!res.ok) throw new Error(`hype request failed: ${res.status}`);
        const data: ChatResponse = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: "coach",
            text: data.text,
            intensity: data.intensity ?? "explosive",
            sources: data.sources ?? [],
            segments: data.segments ?? [],
            autoSpeak: voiceReplies,
            persona,
            timestamp: Date.now(),
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: "coach",
            text: "I couldn't reach the hype desk. Make sure the backend is running, then try again.",
            intensity: "calm",
            timestamp: Date.now(),
          },
        ]);
      } finally {
        clearPipeline();
      }
    },
    [language, persona, voiceReplies],
  );

  // wipe the session and return to the landing state
  const resetChat = useCallback(() => {
    clearPipeline();
    setMessages([]);
    setTeam(null); // session-only memory dies with the session
  }, []);

  return { messages, pipelineState, team, sendMessage, sendHype, resetChat };
}
