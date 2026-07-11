import { useEffect, useRef, useState } from "react";
import { AlertCircle, Play, Square } from "lucide-react";
import type { Intensity, Language } from "@/lib/types";
import { INTENSITY_COLORS } from "@/lib/types";

type AudioState = "idle" | "loading" | "playing" | "error";

interface AudioPlayerProps {
  text: string;
  intensity: Intensity;
  language: Language;
}

export default function AudioPlayer({ text, intensity, language }: AudioPlayerProps) {
  const [state, setState] = useState<AudioState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const color = INTENSITY_COLORS[intensity];

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const stop = () => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setState("idle");
  };

  const play = async () => {
    // reuse the already-fetched audio if we have it
    if (audioRef.current && urlRef.current) {
      setState("playing");
      audioRef.current.play();
      return;
    }

    setState("loading");
    try {
      const res = await fetch("/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice_style: intensity, language }),
      });
      if (!res.ok) throw new Error(`speak request failed: ${res.status}`);

      const blob = await res.blob();
      urlRef.current = URL.createObjectURL(blob);
      const audio = new Audio(urlRef.current);
      audio.onended = () => setState("idle");
      audio.onerror = () => setState("error");
      audioRef.current = audio;

      setState("playing");
      await audio.play();
    } catch {
      setState("error");
    }
  };

  return (
    <div className="flex items-center gap-3 mt-3">
      {state === "idle" && (
        <button
          onClick={play}
          className="flex items-center justify-center w-11 h-11 -m-2 text-muted hover:text-primary transition-colors"
          aria-label="Play audio"
        >
          <Play size={18} />
        </button>
      )}

      {state === "loading" && (
        <div className="flex items-center justify-center w-11 h-11 -m-2">
          <div className="spinner" />
        </div>
      )}

      {state === "playing" && (
        <>
          <button
            onClick={stop}
            className="flex items-center justify-center w-11 h-11 -m-2 transition-colors"
            style={{ color }}
            aria-label="Stop audio"
          >
            <Square size={16} fill="currentColor" />
          </button>
          {/* waveform sized to read on a projector */}
          <div className="flex items-end gap-1 h-4" aria-hidden>
            <span className="waveform-bar" style={{ backgroundColor: color }} />
            <span className="waveform-bar" style={{ backgroundColor: color }} />
            <span className="waveform-bar" style={{ backgroundColor: color }} />
          </div>
        </>
      )}

      {state === "error" && (
        <button
          onClick={play}
          className="flex items-center gap-2 text-muted text-xs"
          aria-label="Audio failed, retry"
        >
          <AlertCircle size={16} />
          <span>audio unavailable</span>
        </button>
      )}
    </div>
  );
}
