import { useEffect, useRef, useState } from "react";
import { ImagePlus, Mic, SendHorizonal, Square, X, Zap } from "lucide-react";
import type {
  HypeMode,
  Language,
  Persona,
  PipelineState,
  Message,
} from "@/lib/types";
import { HYPE_UI, SUGGESTED_PROMPTS } from "@/lib/types";
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
  onSend: (text: string, image?: string, opts?: { voice?: boolean }) => void;
  onHype: (team: string, mode: HypeMode) => void;
}

/** F9: one-tap hype — a small popover above the input bar asking for a team
 *  and a flavor (match preview / trash talk). */
function HypePopover({
  language,
  onGenerate,
  onClose,
}: {
  language: Language;
  onGenerate: (team: string, mode: HypeMode) => void;
  onClose: () => void;
}) {
  const [team, setTeam] = useState("");
  const ui = HYPE_UI[language];

  const generate = (mode: HypeMode) => {
    if (!team.trim()) return;
    onGenerate(team.trim(), mode);
    onClose();
  };

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 mx-auto max-w-2xl rounded-md border border-border bg-surface p-4 shadow-xl">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{ui.title}</span>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center text-muted hover:text-primary"
          aria-label="Close hype generator"
        >
          <X size={14} />
        </button>
      </div>
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <input
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate("preview")}
          placeholder={ui.placeholder}
          autoFocus
          className="flex-1 rounded-sm border border-border bg-bg px-3 h-10 text-sm placeholder:text-muted focus:outline-none focus:border-accent/50"
        />
        <div className="flex gap-2">
          <button
            onClick={() => generate("preview")}
            disabled={!team.trim()}
            className="h-10 px-4 rounded-sm bg-accent text-black text-sm font-medium disabled:opacity-30"
          >
            {ui.preview}
          </button>
          <button
            onClick={() => generate("trash-talk")}
            disabled={!team.trim()}
            className="h-10 px-4 rounded-sm border border-accent/60 text-accent text-sm font-medium disabled:opacity-30"
          >
            {ui.trashTalk}
          </button>
        </div>
      </div>
    </div>
  );
}

type MicState = "idle" | "recording" | "transcribing" | "error";

/** Tap to record, tap again to stop: the clip goes to /transcribe (Scribe)
 *  and the transcript is sent as a voice question, whose reply auto-plays —
 *  the full hands-free loop (F8). */
function MicButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [state, setState] = useState<MicState>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setState("transcribing");
        try {
          const form = new FormData();
          form.append(
            "audio",
            new Blob(chunks, { type: recorder.mimeType }),
            "question",
          );
          const res = await fetch("/transcribe", { method: "POST", body: form });
          if (!res.ok) throw new Error(`transcribe failed: ${res.status}`);
          const data: { text: string } = await res.json();
          setState("idle");
          if (data.text) onTranscript(data.text);
        } catch {
          setState("error");
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch {
      // mic permission denied or no input device
      setState("error");
    }
  };

  if (state === "transcribing") {
    return (
      <div
        className="shrink-0 w-11 h-11 flex items-center justify-center rounded-sm border border-border bg-surface"
        aria-label="Transcribing"
      >
        <div className="spinner" />
      </div>
    );
  }

  if (state === "recording") {
    return (
      <button
        onClick={() => recorderRef.current?.stop()}
        className="shrink-0 w-11 h-11 flex items-center justify-center rounded-sm border border-red-500/60 bg-red-500/10 text-red-400"
        aria-label="Stop recording"
      >
        <Square size={16} fill="currentColor" className="pulse-dot" />
      </button>
    );
  }

  return (
    <button
      onClick={start}
      className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-sm border border-border bg-surface transition-colors ${
        state === "error" ? "text-red-400" : "text-muted hover:text-primary"
      }`}
      aria-label={state === "error" ? "Voice input failed, retry" : "Ask by voice"}
      title={state === "error" ? "Voice input failed — tap to retry" : "Ask by voice"}
    >
      <Mic size={18} />
    </button>
  );
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
  onHype,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [hypeOpen, setHypeOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pipelineState]);

  // downscale to <=1280px on the long edge before upload: phone screenshots
  // are 3-12 MB and would bloat the base64 payload and Gemini token cost
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX_EDGE = 1280;
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        if (scale === 1) {
          setImage(dataUrl);
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setImage(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = dataUrl;
    };
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
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
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
          <div className="flex flex-wrap justify-center gap-2 max-w-xl">
            {SUGGESTED_PROMPTS[language].map((prompt) => (
              <button
                key={prompt}
                onClick={() => onSend(prompt)}
                className="px-4 h-9 rounded-full border border-border bg-surface/80 text-xs text-muted hover:text-primary hover:border-accent/40 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="chat-scroll flex-1 overflow-y-auto px-4 py-6"
        >
          {/* aria-live so screen readers announce coach replies as they land */}
          <div aria-live="polite" className="max-w-2xl mx-auto flex flex-col gap-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} language={language} />
            ))}
            {pipelineState && <PipelineIndicator state={pipelineState} />}
          </div>
        </div>
      )}

      {/* input bar */}
      <div className="relative border-t border-border bg-bg/60 backdrop-blur-md px-4 py-3">
        {hypeOpen && (
          <HypePopover
            language={language}
            onGenerate={onHype}
            onClose={() => setHypeOpen(false)}
          />
        )}
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

          <MicButton onTranscript={(text) => onSend(text, undefined, { voice: true })} />

          <button
            onClick={() => setHypeOpen((v) => !v)}
            className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-sm border transition-colors ${
              hypeOpen
                ? "border-accent/60 bg-accent/10 text-accent"
                : "border-border bg-surface text-muted hover:text-primary"
            }`}
            aria-label="Hype generator"
            aria-expanded={hypeOpen}
            title="Hype generator"
          >
            <Zap size={18} />
          </button>

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
