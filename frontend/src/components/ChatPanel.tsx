import { useEffect, useRef, useState } from "react";
import { ImagePlus, SendHorizonal, X } from "lucide-react";
import type { Language, Persona, PipelineState, Message } from "@/lib/types";
import MessageBubble from "@/components/MessageBubble";
import PersonaPicker from "@/components/PersonaPicker";

interface ChatPanelProps {
  isActive: boolean;
  messages: Message[];
  pipelineState: PipelineState | null;
  persona: Persona;
  language: Language;
  onPersonaChange: (p: Persona) => void;
  onLanguageChange: (l: Language) => void;
  onSend: (text: string, image?: string) => void;
}

function PipelineIndicator({ state }: { state: PipelineState }) {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3">
        <div className="flex gap-1" aria-hidden>
          <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-accent" />
          <span
            className="pulse-dot w-1.5 h-1.5 rounded-full bg-accent"
            style={{ animationDelay: "0.2s" }}
          />
          <span
            className="pulse-dot w-1.5 h-1.5 rounded-full bg-accent"
            style={{ animationDelay: "0.4s" }}
          />
        </div>
        <span className="text-xs font-mono text-muted">{state}</span>
      </div>
    </div>
  );
}

export default function ChatPanel({
  isActive,
  messages,
  pipelineState,
  persona,
  language,
  onPersonaChange,
  onLanguageChange,
  onSend,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pipelineState]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const send = () => {
    const text = draft.trim();
    if (!text && !image) return;
    onSend(text, image ?? undefined);
    setDraft("");
    setImage(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // grow the textarea with content up to a cap
  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex flex-col h-full pt-14">
      {/* center zone: landing hero or scrolling message list */}
      {!isActive ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
              FootyIQ
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted">
              Your coach in your pocket for the 2026 World Cup
            </p>
          </div>
          <PersonaPicker
            persona={persona}
            language={language}
            onPersonaChange={onPersonaChange}
            onLanguageChange={onLanguageChange}
          />
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="chat-scroll flex-1 overflow-y-auto px-4 py-6"
        >
          <div className="max-w-2xl mx-auto flex flex-col gap-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} language={language} />
            ))}
            {pipelineState && <PipelineIndicator state={pipelineState} />}
          </div>
        </div>
      )}

      {/* input bar */}
      <div className="border-t border-border bg-bg/60 backdrop-blur-md px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-end gap-3">
          {image && (
            <div className="relative shrink-0">
              <img
                src={image}
                alt="preview"
                className="w-16 h-16 rounded-lg object-cover border border-border"
              />
              <button
                onClick={() => setImage(null)}
                className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-surface border border-border text-muted hover:text-primary"
                aria-label="Remove image"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 w-11 h-11 flex items-center justify-center rounded-sm border border-border bg-surface text-muted hover:text-primary transition-colors"
            aria-label="Attach image"
          >
            <ImagePlus size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />

          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            rows={1}
            placeholder="Ask anything about the match..."
            className="flex-1 resize-none rounded-sm border border-border bg-surface px-4 py-3 text-sm placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
          />

          <button
            onClick={send}
            disabled={!draft.trim() && !image}
            className="shrink-0 w-11 h-11 flex items-center justify-center rounded-sm bg-accent text-black disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
            aria-label="Send message"
          >
            <SendHorizonal size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
