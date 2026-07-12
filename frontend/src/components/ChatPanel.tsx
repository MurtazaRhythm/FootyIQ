import { useEffect, useRef, useState } from "react";
import { ArrowUp, ImagePlus, Megaphone, Mic, X } from "lucide-react";
import type { HypeMode, Language, Persona, PipelineState, Message } from "@/lib/types";
import {
  COMPOSER_PLACEHOLDERS,
  HYPE_UI,
  LISTENING_PHRASES,
  SUGGESTED_PROMPTS,
} from "@/lib/types";
import MessageBubble from "@/components/MessageBubble";
import VoiceOrb from "@/components/ui/voice-orb";
import { TextShimmer } from "@/components/loading-ui/text-shimmer";

interface ChatPanelProps {
  isActive: boolean;
  messages: Message[];
  pipelineState: PipelineState | null;
  language: Language;
  persona: Persona;
  voiceMode: boolean;
  onVoiceModeToggle: () => void;
  onSend: (text: string, image?: string, opts?: { voice?: boolean }) => void;
  onHype: (team: string, mode: HypeMode) => void;
}

const HYPE_MODE_LABELS: Record<Language, Record<HypeMode, string>> = {
  en: { "preview": "Match Preview", "trash-talk": "Trash Talk" },
  fr: { "preview": "Avant-match",   "trash-talk": "Chambrage"  },
  es: { "preview": "Previa",        "trash-talk": "Pique"      },
};

function PipelineIndicator({ state }: { state: PipelineState }) {
  return (
    <div className="flex items-center gap-1.5 pl-0.5">
      <TextShimmer className="text-sm font-medium" duration={1.6}>
        {state}
      </TextShimmer>
      <span className="flex items-center gap-[3px] mb-[1px]" aria-hidden>
        <span className="pulse-dot w-[3px] h-[3px] rounded-full bg-muted" />
        <span className="pulse-dot w-[3px] h-[3px] rounded-full bg-muted" style={{ animationDelay: "0.2s" }} />
        <span className="pulse-dot w-[3px] h-[3px] rounded-full bg-muted" style={{ animationDelay: "0.4s" }} />
      </span>
    </div>
  );
}

export default function ChatPanel({
  isActive,
  messages,
  pipelineState,
  language,
  persona,
  voiceMode,
  onVoiceModeToggle,
  onSend,
  onHype,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [hypeMode, setHypeMode] = useState<HypeMode | null>(null);
  const [titlePhase, setTitlePhase] = useState<"in" | "out">("in");

  useEffect(() => {
    if (isActive) return;
    const cycle = setInterval(() => {
      setTitlePhase("out");
      setTimeout(() => setTitlePhase("in"), 800);
    }, 10000);
    return () => clearInterval(cycle);
  }, [isActive]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // suggested prompts rotate in pages of 4 with a crossfade
  const PROMPTS_PER_PAGE = 4;
  const prompts = SUGGESTED_PROMPTS[language];
  const pageCount = Math.ceil(prompts.length / PROMPTS_PER_PAGE);
  const [promptPage, setPromptPage] = useState(0);
  const [promptsVisible, setPromptsVisible] = useState(true);

  useEffect(() => {
    setPromptPage(0);
    setPromptsVisible(true);
  }, [language]);

  useEffect(() => {
    if (isActive || pageCount < 2) return;
    const interval = setInterval(() => {
      setPromptsVisible(false);
      setTimeout(() => {
        setPromptPage((p) => (p + 1) % pageCount);
        setPromptsVisible(true);
      }, 500);
    }, 6000);
    return () => clearInterval(interval);
  }, [isActive, pageCount]);

  const visiblePrompts = prompts.slice(
    promptPage * PROMPTS_PER_PAGE,
    promptPage * PROMPTS_PER_PAGE + PROMPTS_PER_PAGE,
  );

  // mic state lives up here because the placeholder rotation depends on it
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const dictationBaseRef = useRef("");

  // composer placeholder rotates with a fade; while the mic is on it cycles
  // through the listening phrases instead
  const placeholders = COMPOSER_PLACEHOLDERS[language];
  const listeningPhrases = LISTENING_PHRASES[language];
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const activePhrases = listening ? listeningPhrases : placeholders;
  const placeholderText = activePhrases[placeholderIdx % activePhrases.length];

  useEffect(() => {
    setPlaceholderIdx(0);
    setPlaceholderVisible(true);
  }, [language, listening]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderVisible(false);
      setTimeout(() => {
        setPlaceholderIdx((i) => (i + 1) % activePhrases.length);
        setPlaceholderVisible(true);
      }, 300);
    }, listening ? 2200 : 4000);
    return () => clearInterval(interval);
  }, [listening, activePhrases.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pipelineState]);

  // downscale to <=1280px on the long edge before upload to reduce payload size
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
    if (hypeMode) {
      if (!text) return;
      onHype(text, hypeMode);
      setHypeMode(null);
      setDraft("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      return;
    }
    if (!text && !image) return;
    recognitionRef.current?.abort();
    onSend(text, image ?? undefined, listening ? { voice: true } : undefined);
    setListening(false);
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


  const latestCoachId = [...messages]
    .reverse()
    .find((m) => m.role === "coach")?.id;

  // voice dictation via the Web Speech API
  const SpeechRecognitionImpl =
    window.SpeechRecognition ?? window.webkitSpeechRecognition;

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  // strip non-speech annotations from Web Speech transcripts
  const cleanTranscript = (text: string) =>
    text.replace(/[([][^)\]]*[)\]]/g, "").trim();

  const toggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    if (!SpeechRecognitionImpl) return;

    const recognition = new SpeechRecognitionImpl();
    recognition.lang =
      language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    // dictation appends to whatever was already typed
    dictationBaseRef.current = draft.trim();

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const base = dictationBaseRef.current;
      const cleaned = cleanTranscript(transcript);
      setDraft(base ? `${base} ${cleaned.trimStart()}` : cleaned.trimStart());
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const [audioPlaying, setAudioPlaying] = useState(false);
  const [orbDismissed, setOrbDismissed] = useState(false);

  // reset dismissed state whenever new audio starts
  useEffect(() => {
    if (audioPlaying) setOrbDismissed(false);
  }, [audioPlaying]);

  const resolvedOrbState = pipelineState
    ? "processing"
    : audioPlaying
      ? "speaking"
      : "idle";

  // show orb when voice mode is on OR audio is actively playing
  const showOrb = (voiceMode || audioPlaying) && !orbDismissed;

  const handleOrbToggle = () => {
    if (voiceMode) onVoiceModeToggle();
    setOrbDismissed(true);
  };

  const composer = (
    <div className="relative glass-panel rounded-xl">
      {image && (
        <div className="px-3 pt-3">
          <div className="relative inline-block">
            <img
              src={image}
              alt="preview"
              className="h-16 w-16 rounded-lg object-cover border border-border"
            />
            <button
              onClick={() => setImage(null)}
              className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-bg text-muted hover:text-primary"
              aria-label="Remove image"
            >
              <X size={11} />
            </button>
          </div>
        </div>
      )}

      {/* animated placeholder overlay; native placeholders can't fade */}
      <div className="relative">
        {!draft && (
          <span
            className={`pointer-events-none absolute left-4 top-3.5 text-sm leading-relaxed transition-all duration-300 ease-out ${
              listening ? "text-red-400" : "text-muted"
            } ${
              hypeMode || placeholderVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-1"
            }`}
            aria-hidden
          >
            {hypeMode ? HYPE_UI[language].placeholder : placeholderText}
          </span>
        )}
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          rows={1}
          aria-label="Message"
          className="w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-sm leading-relaxed focus:outline-none"
        />
      </div>

      <div className="flex items-center justify-between px-2.5 pb-2.5">
        <div className="flex items-center gap-1.5">
          {hypeMode ? (
            /* mode pills inline in the toolbar when hype is active */
            <div className="flex items-center gap-1 p-0.5 rounded-lg border border-border bg-primary/[0.03]">
              {(["preview", "trash-talk"] as HypeMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setHypeMode(m)}
                  className={`px-2.5 h-6 rounded-md text-[11px] font-medium transition-all ${
                    hypeMode === m ? "bg-accent text-bg" : "text-muted hover:text-primary"
                  }`}
                >
                  {HYPE_MODE_LABELS[language][m]}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/5 hover:text-primary"
              aria-label="Attach image"
            >
              <ImagePlus size={16} />
            </button>
          )}
        </div>
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

        <div className="flex items-center gap-1.5">
          {/* hype generator toggle */}
          <button
            onClick={() => setHypeMode((m) => m === null ? "preview" : null)}
            className={
              hypeMode
                ? "flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent transition-colors"
                : "flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/5 hover:text-primary"
            }
            aria-label="Hype generator"
            aria-pressed={hypeMode !== null}
            title="Hype generator"
          >
            <Megaphone size={16} />
          </button>

          {/* voice mode toggle */}
          <button
            onClick={onVoiceModeToggle}
            className={
              voiceMode
                ? "flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent transition-colors"
                : "flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/5 hover:text-primary"
            }
            aria-label={voiceMode ? "Turn voice replies off" : "Turn voice replies on"}
            aria-pressed={voiceMode}
          >
            <svg width="18" height="16" viewBox="0 0 18 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0"  y="6"  width="2" height="4"  rx="1" fill="currentColor" />
              <rect x="4"  y="3"  width="2" height="10" rx="1" fill="currentColor" />
              <rect x="8"  y="0"  width="2" height="16" rx="1" fill="currentColor" />
              <rect x="12" y="3"  width="2" height="10" rx="1" fill="currentColor" />
              <rect x="16" y="6"  width="2" height="4"  rx="1" fill="currentColor" />
            </svg>
          </button>

          {SpeechRecognitionImpl && (
            <button
              onClick={toggleMic}
              className={
                listening
                  ? "mic-listening flex h-8 w-8 items-center justify-center rounded-lg bg-red-500 text-white transition-colors"
                  : "flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/5 hover:text-primary"
              }
              aria-label={listening ? "Stop dictation" : "Dictate message"}
              aria-pressed={listening}
            >
              <Mic size={16} />
            </button>
          )}

          <button
            onClick={send}
            disabled={!draft.trim() && !image}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-bg transition-opacity hover:opacity-90 disabled:opacity-25 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <ArrowUp size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full pt-14">
      {/* Voice orb overlay — shown when voice mode is on OR audio is playing */}
      {showOrb && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
          <VoiceOrb
            state={resolvedOrbState}
            onToggle={handleOrbToggle}
            className="w-full h-full"
          />
          <button
            onClick={handleOrbToggle}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-sm text-white/60 border border-white/10 hover:text-white hover:border-white/30 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
      {!isActive ? (
        /* landing: hero, suggested prompts, composer directly below them */
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4">
          <div className="text-center animate-fade-up" style={{ animationDelay: "0.05s" }}>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              {"Pitchside".split("").map((char, i, arr) => (
                <span
                  key={i}
                  className={titlePhase === "in" ? "letter-in" : "letter-out"}
                  style={{
                    animationDelay: titlePhase === "in"
                      ? `${i * 0.06}s`
                      : `${(arr.length - 1 - i) * 0.06}s`,
                  }}
                >
                  {char}
                </span>
              ))}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted">
              Your coach in your pocket for the 2026 World Cup
            </p>
          </div>

          <div
            className={`flex flex-wrap justify-center gap-2 max-w-xl transition-all duration-500 ease-out animate-fade-up ${
              promptsVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-1.5"
            }`}
            style={{ animationDelay: "0.15s" }}
          >
            {visiblePrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => onSend(prompt)}
                className="glass-chip px-4 h-8 rounded-full text-xs text-primary/80 hover:text-primary"
              >
                <span className="relative z-10">{prompt}</span>
              </button>
            ))}
          </div>

          <div className="w-full max-w-xl animate-fade-up" style={{ animationDelay: "0.25s" }}>{composer}</div>
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="chat-scroll flex-1 overflow-y-auto px-4 py-8"
          >
            <div aria-live="polite" className="max-w-2xl mx-auto flex flex-col gap-7">
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  language={language}
                  persona={persona}
                  autoPlayAudio={
                    (voiceMode || !!m.autoSpeak) && m.id === latestCoachId
                  }
                  onAudioPlaying={setAudioPlaying}
                />
              ))}
              {pipelineState && <PipelineIndicator state={pipelineState} />}
            </div>
          </div>

          <div className="px-4 pb-6 pt-2">
            <div className="max-w-2xl mx-auto">{composer}</div>
          </div>
        </>
      )}
    </div>
  );
}
