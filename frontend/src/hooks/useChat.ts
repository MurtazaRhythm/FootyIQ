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
import { HYPE_LABELS } from "@/lib/types";

interface ChatResponse {
  text: string;
  intensity?: Intensity;
  sources?: Source[];
}

const PIPELINE_STEPS: PipelineState[] = [
  "thinking",
  "checking live data",
  "writing commentary",
  "generating audio",
];

let nextId = 0;
const makeId = () => `msg-${Date.now()}-${nextId++}`;

export function useChat(persona: Persona, language: Language) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pipelineState, setPipelineState] = useState<PipelineState | null>(null);
  const pipelineTimers = useRef<number[]>([]);

  const clearPipeline = () => {
    pipelineTimers.current.forEach((t) => window.clearTimeout(t));
    pipelineTimers.current = [];
    setPipelineState(null);
  };

  // advance through discrete pipeline states while waiting on the backend
  const startPipeline = () => {
    setPipelineState(PIPELINE_STEPS[0]);
    PIPELINE_STEPS.slice(1).forEach((step, i) => {
      pipelineTimers.current.push(
        window.setTimeout(() => setPipelineState(step), (i + 1) * 1800),
      );
    });
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
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: "coach",
            text: data.text,
            intensity: data.intensity ?? "calm",
            sources: data.sources ?? [],
            // hands-free loop: a spoken question gets a spoken answer
            autoSpeak: opts?.voice ?? false,
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
    [persona, language],
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
    [language],
  );

  // wipe the session and return to the landing state
  const resetChat = useCallback(() => {
    clearPipeline();
    setMessages([]);
  }, []);

  return { messages, pipelineState, sendMessage, sendHype, resetChat };
}
