import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Camera,
  Heart,
  ImagePlus,
  Megaphone,
  Mic,
  Phone,
  X,
} from "lucide-react";
import type { HypeMode, Language, Persona, PipelineState, Message } from "@/lib/types";
import {
  COMPOSER_PLACEHOLDERS,
  HYPE_UI,
  LISTENING_PHRASES,
  SUGGESTED_PROMPTS,
  SUPPORTING_LABEL,
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
  supportedTeam: string | null; // S7: visible session memory
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
      <span className="flex items-center gap-[3px] translate-y-[3px]" aria-hidden>
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
  supportedTeam,
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // S3: show the straight-to-camera button only where a camera is likely
  const isTouchDevice =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;

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
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // S4 Coach Call: hands-free conversation loop + orb/audio plumbing
  const [callActive, setCallActive] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [orbDismissed, setOrbDismissed] = useState(false);
  const [stopSignal, setStopSignal] = useState(0);
  const discardRef = useRef(false);
  const vadStopRef = useRef<(() => void) | null>(null);

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

  useEffect(() => {
    return () => mediaRecorderRef.current?.stop();
  }, []);

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
    mediaRecorderRef.current?.stop();
    onSend(text, image ?? undefined);
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

  const startListening = async (vad: boolean) => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // surface it — a silent return makes the button look dead
      setDraft(
        "Mic access is blocked — allow the microphone for this site in your browser settings, then try again.",
      );
      setCallActive(false); // can't hold a call without a mic
      return;
    }

    const recorder = new MediaRecorder(stream);
    audioChunksRef.current = [];
    discardRef.current = false;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    // S4: voice-activity detection ends the turn after ~1.5s of silence
    // following speech, so a Coach Call needs zero touches between turns
    if (vad) {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      let spoke = false;
      let silentMs = 0;
      const interval = window.setInterval(() => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        if (rms > 0.02) {
          spoke = true;
          silentMs = 0;
        } else if (spoke) {
          silentMs += 100;
        }
        if (spoke && silentMs >= 1500 && recorder.state === "recording") {
          recorder.stop();
        }
      }, 100);
      // hard cap so a noisy room can't record forever
      const cap = window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 20000);
      vadStopRef.current = () => {
        window.clearInterval(interval);
        window.clearTimeout(cap);
        ctx.close();
      };
    }

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      vadStopRef.current?.();
      vadStopRef.current = null;
      setListening(false);
      if (discardRef.current) return; // hang-up: drop the clip unsent
      setTranscribing(true);
      try {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const form = new FormData();
        form.append("audio", blob, "voice.webm");
        const res = await fetch("/transcribe", { method: "POST", body: form });
        if (res.ok) {
          const { text } = await res.json();
          // Scribe tags non-speech as "(percussive sound effects)" etc. —
          // strip annotations so noise is never sent as a question
          const clean = text.replace(/[([][^)\]]*[)\]]/g, "").trim();
          if (clean) {
            onSend(clean, undefined, { voice: true });
          } else {
            setDraft("Didn't catch that — try again or type your question.");
          }
        } else {
          const err = await res.json().catch(() => ({}));
          setDraft(err?.detail ?? "Transcription failed — type your message instead.");
        }
      } catch {
        setDraft("Transcription failed — type your message instead.");
      }
      setTranscribing(false);
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setListening(true);
    // a previous orb dismissal shouldn't hide the orb for new recordings
    setOrbDismissed(false);
  };

  const toggleMic = () => {
    if (listening) {
      mediaRecorderRef.current?.stop();
      return;
    }
    startListening(false);
  };

  // S4: the call loop — whenever an active call goes idle (nothing being
  // recorded, transcribed, generated, or spoken), reopen the mic
  useEffect(() => {
    if (!callActive) return;
    if (listening || transcribing || pipelineState || audioPlaying) return;
    const t = window.setTimeout(() => startListening(true), 700);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callActive, listening, transcribing, pipelineState, audioPlaying]);

  const endCall = () => {
    setCallActive(false);
    if (mediaRecorderRef.current?.state === "recording") {
      discardRef.current = true; // whatever was mid-recording dies with the call
      mediaRecorderRef.current.stop();
    }
    setStopSignal((s) => s + 1); // cut off any speech in progress
  };

  // reset dismissed state whenever new audio starts
  useEffect(() => {
    if (audioPlaying) setOrbDismissed(false);
  }, [audioPlaying]);

  const resolvedOrbState = pipelineState || transcribing
    ? "processing"
    : audioPlaying
      ? "speaking"
      : listening
        ? "listening"
        : "idle";

  // the orb belongs to the mic flow and Coach Calls — voiceMode is just
  // the auto-speak mute and shouldn't summon a full-screen overlay
  const showOrb = callActive || ((listening || transcribing) && !orbDismissed);
  const showAudioGlow = audioPlaying && !showOrb;

  const handleOrbToggle = () => {
    if (callActive) {
      endCall();
    } else if (listening) {
      mediaRecorderRef.current?.stop();
    }
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
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/5 hover:text-primary"
                aria-label="Attach image"
              >
                <ImagePlus size={16} />
              </button>
              {/* S3: touch devices get a straight-to-camera button — point
                  the phone at the TV's VAR freeze-frame and ask */}
              {isTouchDevice && (
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/5 hover:text-primary"
                  aria-label="Take a photo"
                >
                  <Camera size={16} />
                </button>
              )}
            </>
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
        {/* S3: capture="environment" opens the rear camera directly on
            mobile; desktop never sees this input (button is touch-only) */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
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

          {/* S4: start a hands-free Coach Call */}
          <button
            onClick={() => setCallActive(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/5 hover:text-primary"
            aria-label="Start a coach call"
            title="Coach Call — hands-free conversation"
          >
            <Phone size={16} />
          </button>

          <button
            onClick={toggleMic}
            disabled={transcribing}
            className={
              listening
                ? "mic-listening flex h-8 w-8 items-center justify-center rounded-lg bg-red-500 text-white transition-colors"
                : transcribing
                  ? "flex h-8 w-8 items-center justify-center rounded-lg text-accent transition-colors"
                  : "flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/5 hover:text-primary"
            }
            aria-label={listening ? "Stop recording" : "Voice message"}
            aria-pressed={listening}
          >
            {transcribing ? <div className="spinner" /> : <Mic size={16} />}
          </button>

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
      {/* Centered glow orb when AI is speaking */}
      {showAudioGlow && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <div className="absolute inset-0 flex items-center justify-center">
            <div style={{ width: 64, height: 64 }}>
              <VoiceOrb state="speaking" onToggle={() => {}} hideIcon forceAnimated />
            </div>
          </div>
          <button
            onClick={() => setStopSignal((s) => s + 1)}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-sm text-white/60 border border-white/10 hover:text-white hover:border-white/30 transition-colors pointer-events-auto"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Voice orb overlay — shown when voice mode is on OR recording/transcribing */}
      {showOrb && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
          <VoiceOrb
            state={resolvedOrbState}
            onToggle={handleOrbToggle}
            className="w-full h-full"
            hideIcon
          />
          <button
            onClick={handleOrbToggle}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-sm text-white/60 border border-white/10 hover:text-white hover:border-white/30 transition-colors"
          >
            {callActive ? "End call" : "Cancel"}
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
                  stopSignal={stopSignal}
                />
              ))}
              {pipelineState && (
                <div className="flex justify-start">
                  <PipelineIndicator state={pipelineState} />
                </div>
              )}
            </div>
          </div>

          <div className="px-4 pb-6 pt-2">
            <div className="max-w-2xl mx-auto">
              {/* S7: the session's remembered allegiance, at a glance */}
              {supportedTeam && (
                <div className="mb-2 flex animate-fade-up">
                  <span className="glass-chip inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] text-primary/80">
                    <Heart size={11} className="text-accent" aria-hidden />
                    {SUPPORTING_LABEL[language]}: {supportedTeam}
                  </span>
                </div>
              )}
              {composer}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
