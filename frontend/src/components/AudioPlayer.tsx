import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import type { Intensity, Language } from "@/lib/types";
import { INTENSITY_COLORS } from "@/lib/types";

type AudioState = "idle" | "loading" | "playing" | "error";

interface AudioPlayerProps {
  text: string;
  intensity: Intensity;
  language: Language;
  /** voice mode: start speaking as soon as the message arrives */
  autoPlay?: boolean;
  /** message creation time, so toggling voice mode on later won't replay old messages */
  createdAt?: number;
  /** called with true when audio starts, false when it stops */
  onPlayingChange?: (playing: boolean) => void;
  /** increment to force-stop playback */
  stopSignal?: number;
}

export default function AudioPlayer({
  text,
  intensity,
  language,
  autoPlay = false,
  createdAt,
  onPlayingChange,
  stopSignal = 0,
}: AudioPlayerProps) {
  const [state, setState] = useState<AudioState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const autoPlayedRef = useRef(false);
  const color = INTENSITY_COLORS[intensity];

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  useEffect(() => {
    if (stopSignal > 0) stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopSignal]);

  const stop = () => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setState("idle");
    onPlayingChange?.(false);
  };

  const play = async () => {
    // reuse the already-fetched audio if we have it
    if (audioRef.current && urlRef.current) {
      setState("playing");
      onPlayingChange?.(true);
      audioRef.current.play();
      return;
    }

    setState("loading");
    onPlayingChange?.(true);
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
      audio.onended = () => { setState("idle"); onPlayingChange?.(false); };
      audio.onerror = () => { setState("error"); onPlayingChange?.(false); };
      audioRef.current = audio;

      setState("playing");
      onPlayingChange?.(true);
      await audio.play();
    } catch {
      setState("error");
      onPlayingChange?.(false);
    }
  };

  // voice mode: speak fresh messages automatically, exactly once
  useEffect(() => {
    if (!autoPlay || autoPlayedRef.current) return;
    const isFresh = createdAt === undefined || Date.now() - createdAt < 10_000;
    if (!isFresh) return;
    autoPlayedRef.current = true;
    play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  const isPlaying = state === "playing";
  const isLoading = state === "loading";

  return (
    <div className="flex items-center gap-2.5 mt-2">
      {state === "error" ? (
        <button
          onClick={play}
          className="flex items-center gap-2 text-muted text-xs"
          aria-label="Audio failed, retry"
        >
          <AlertCircle size={16} />
          <span>audio unavailable</span>
        </button>
      ) : (
        <button
          onClick={isPlaying ? stop : play}
          className="flex items-center justify-center h-7 w-7 -ml-1.5 rounded-lg transition-colors hover:bg-primary/5"
          style={{ color: isPlaying ? color : undefined }}
          aria-label={isPlaying ? "Stop audio" : "Play audio"}
        >
          {isLoading ? (
            <div className="spinner" />
          ) : (
            <svg width="18" height="16" viewBox="0 0 18 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={isPlaying ? "" : "text-muted"}>
              <rect x="0"  y="6"  width="2" height="4"  rx="1" fill="currentColor" />
              <rect x="4"  y="3"  width="2" height="10" rx="1" fill="currentColor" />
              <rect x="8"  y="0"  width="2" height="16" rx="1" fill="currentColor" />
              <rect x="12" y="3"  width="2" height="10" rx="1" fill="currentColor" />
              <rect x="16" y="6"  width="2" height="4"  rx="1" fill="currentColor" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
