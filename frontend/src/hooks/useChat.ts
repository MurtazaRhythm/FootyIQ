import { useCallback, useRef, useState } from "react";
import type {
  Intensity,
  Language,
  Message,
  Persona,
  PipelineState,
} from "@/lib/types";

interface ChatResponse {
  text: string;
  intensity?: Intensity;
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
    async (text: string, image?: string) => {
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

  return { messages, pipelineState, sendMessage };
}
