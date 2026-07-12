import { useState } from "react";
import { cn } from "@/lib/utils";

export type OrbState = "idle" | "listening" | "processing" | "speaking";

interface VoiceOrbProps {
  state: OrbState;
  onToggle: () => void;
  className?: string;
  hideIcon?: boolean;
  forceAnimated?: boolean;
}

export default function VoiceOrb({ state, onToggle, className, hideIcon = false, forceAnimated = false }: VoiceOrbProps) {
  const [checked, setChecked] = useState(false);

  const toggle = () => {
    setChecked((v) => !v);
    onToggle();
  };

  return (
    <div className={cn("container-vao", className)}>
      {/* SVG filter for gooey effect */}
      <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <filter id="gooey">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
          <feColorMatrix
            values="1 0 0 0 0
            0 1 0 0 0
            0 0 1 0 0
            0 0 0 20 -10"
          />
        </filter>
      </svg>

      <div className={cn("orb", checked ? "orb-checked" : "orb-unchecked", forceAnimated && "orb-force-animated")} onClick={toggle}>
        <div className="icons" style={{ opacity: hideIcon ? 0 : undefined }}>
          <svg
            className="svg"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
          >
            <g className="close" style={{ opacity: checked ? 1 : 0 }}>
              <path
                fill="currentColor"
                d="M18.3 5.71a.996.996 0 0 0-1.41 0L12 10.59L7.11 5.7A.996.996 0 1 0 5.7 7.11L10.59 12L5.7 16.89a.996.996 0 1 0 1.41 1.41L12 13.41l4.89 4.89a.996.996 0 1 0 1.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4"
              />
            </g>
            <g fill="none" className="mic" style={{ opacity: checked ? 0 : 1 }}>
              <rect width="8" height="13" x="8" y="2" fill="currentColor" rx="4" />
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 11a7 7 0 1 0 14 0m-7 10v-2"
              />
            </g>
          </svg>
        </div>
        <div className="ball">
          <div className="container-lines" />
          <div className="container-rings" />
        </div>
      </div>

      <div className={cn("container-chat-ia", checked && "container-chat-ia-open")}>
        <div className="container-title">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M20.5346 6.34625L20.3501 6.7707C20.3213 6.83981 20.2727 6.89885 20.2103 6.94038C20.148 6.98191 20.0748 7.00407 19.9999 7.00407C19.925 7.00407 19.8518 6.98191 19.7895 6.94038C19.7272 6.89885 19.6785 6.83981 19.6497 6.7707L19.4652 6.34625C19.1409 5.59538 18.5469 4.99334 17.8004 4.65894L17.2312 4.40472C17.1622 4.37296 17.1037 4.32206 17.0627 4.25806C17.0217 4.19406 16.9999 4.11965 16.9999 4.04364C16.9999 3.96763 17.0217 3.89322 17.0627 3.82922C17.1037 3.76522 17.1622 3.71432 17.2312 3.68256L17.7689 3.44334C18.5341 3.09941 19.1383 2.47511 19.457 1.69904L19.6475 1.24084C19.6753 1.16987 19.7239 1.10893 19.7869 1.06598C19.8499 1.02303 19.9244 1.00006 20.0007 1.00006C20.0769 1.00006 20.1514 1.02303 20.2144 1.06598C20.2774 1.10893 20.326 1.16987 20.3539 1.24084L20.5436 1.69829C20.8619 2.47451 21.4658 3.09908 22.2309 3.44334L22.7693 3.68331C22.8382 3.71516 22.8965 3.76605 22.9373 3.82997C22.9782 3.89389 22.9999 3.96816 22.9999 4.04402C22.9999 4.11987 22.9782 4.19414 22.9373 4.25806C22.8965 4.32198 22.8382 4.37287 22.7693 4.40472L22.1994 4.65819C21.4531 4.99293 20.8594 5.59523 20.5353 6.34625"
              fill="currentColor"
            />
            <path d="M3 14V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M21 14V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M16.5 18V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 22V2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M7.5 18V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="text-title">
            {state === "listening" && "I'm Listening..."}
            {state === "processing" && "Thinking..."}
            {state === "speaking" && "Speaking..."}
            {state === "idle" && "Voice on"}
          </p>
        </div>
        <div className="container-chat">
          <div className="container-chat-limit">
            <div className="chats">
              <div className="chat-user" style={{ "--delay": 2 } as React.CSSProperties}>
                <p>
                  <span style={{ "--word": 1 } as React.CSSProperties}>Why</span>
                  <span style={{ "--word": 2 } as React.CSSProperties}>was</span>
                  <span style={{ "--word": 3 } as React.CSSProperties}>that</span>
                  <span style={{ "--word": 4 } as React.CSSProperties}>offside?</span>
                </p>
              </div>
              <div className="chat-ia" style={{ "--delay": 5 } as React.CSSProperties}>
                <p>
                  <span style={{ "--word": 1 } as React.CSSProperties}>The</span>
                  <span style={{ "--word": 2 } as React.CSSProperties}>attacker</span>
                  <span style={{ "--word": 3 } as React.CSSProperties}>was</span>
                  <span style={{ "--word": 4 } as React.CSSProperties}>ahead</span>
                  <span style={{ "--word": 5 } as React.CSSProperties}>of</span>
                  <span style={{ "--word": 6 } as React.CSSProperties}>the</span>
                  <span style={{ "--word": 7 } as React.CSSProperties}>last</span>
                  <span style={{ "--word": 8 } as React.CSSProperties}>defender</span>
                  <span style={{ "--word": 9 } as React.CSSProperties}>when</span>
                  <span style={{ "--word": 10 } as React.CSSProperties}>the</span>
                  <span style={{ "--word": 11 } as React.CSSProperties}>ball</span>
                  <span style={{ "--word": 12 } as React.CSSProperties}>was</span>
                  <span style={{ "--word": 13 } as React.CSSProperties}>played.</span>
                </p>
              </div>
              <div className="chat-user" style={{ "--delay": 9 } as React.CSSProperties}>
                <p>
                  <span style={{ "--word": 1 } as React.CSSProperties}>What</span>
                  <span style={{ "--word": 2 } as React.CSSProperties}>about</span>
                  <span style={{ "--word": 3 } as React.CSSProperties}>VAR?</span>
                </p>
              </div>
              <div className="chat-ia" style={{ "--delay": 11 } as React.CSSProperties}>
                <p>
                  <span style={{ "--word": 1 } as React.CSSProperties}>VAR</span>
                  <span style={{ "--word": 2 } as React.CSSProperties}>checked</span>
                  <span style={{ "--word": 3 } as React.CSSProperties}>the</span>
                  <span style={{ "--word": 4 } as React.CSSProperties}>line</span>
                  <span style={{ "--word": 5 } as React.CSSProperties}>and</span>
                  <span style={{ "--word": 6 } as React.CSSProperties}>confirmed</span>
                  <span style={{ "--word": 7 } as React.CSSProperties}>it.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
