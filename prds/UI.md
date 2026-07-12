# UI — Coach in Your Pocket

Frontend specification and setup guide for the AI World Cup Companion hackathon project.

---

## Design direction

Modern, dark, technical-feeling. Reference points: Vercel, Linear, Raycast. Not a sports-cliché look — no jerseys, no ball icons, no green turf textures. The single accent color does all the "football" signaling instead of imagery.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| Component primitives | shadcn/ui |
| Icons | lucide-react |
| TTS playback | browser `<audio>` element |

---

## Design tokens

### Color

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0A0A0B` | page background |
| `--surface` | `#131316` | cards, message bubbles, input bar |
| `--border` | `#232326` | hairline dividers, card borders |
| `--text-primary` | `#FAFAFA` | headings, body |
| `--text-muted` | `#8B8B93` | timestamps, labels, placeholder text |
| `--accent` | `#818cf8` | primary accent — buttons, active states, particle color |
| `--accent-dim` | `#818cf8` at 12% opacity | subtle accent fills, hover states |

Emotional-intensity accent variants for commentary cards (F5) — only ever one visible at a time per message:

| Intensity | Color | Hex |
|---|---|---|
| calm | cool blue | `#4B9BFF` |
| building | amber | `#FFC24B` |
| explosive | full accent | `#818cf8` |

### Typography

- **UI / body:** Geist (Vercel's typeface, free via `npm install geist`)
- **Stats / timestamps / live data:** JetBrains Mono
- **Scale:** 12 / 14 / 16 / 20 / 28 / 40px — weight 400 / 500 / 600 only, nothing heavier

### Radius and spacing

- Corner radius: 8px small elements, 12px cards, 999px pills (persona/language toggles)
- Base spacing unit: 4px — all padding, gap, and margin values are multiples of 4

---

## Layout

Single page app, no routing. Three fixed zones:

```
┌────────────────────────────────────────┐
│ top bar: logo · language pill · persona pill   │  fixed, h-14, backdrop-blur, border-b
├────────────────────────────────────────┤
│                                          │
│   chat area (scrollable)                │  flex-1, overflow-y-auto, px-4 py-6
│   coach messages = cards, left accent   │
│   bar colored by commentary intensity   │
│                                          │
├────────────────────────────────────────┤
│ input bar: text field · image · mic     │  fixed, h-16, border-t, backdrop-blur
└────────────────────────────────────────┘
```

- Top bar stays fixed; persona/language toggles are always one tap away
- Coach response cards use `--surface` background, `--border` outline, and a **3px left accent bar** colored by the message's commentary intensity (calm / building / explosive)
- When audio is playing on a message, show a **waveform/pulse animation** inline (3 animated CSS bars), not just a play icon — this needs to read on a projector with no sound
- Image upload shows a **thumbnail preview inline** before the message is sent
- Show a visible **pipeline state indicator** in the chat area during the 4–8s response window with discrete states: "thinking" → "checking live data" → "writing commentary" → "generating audio"

---

## Animated background

The flow-field particle canvas is the main background for the **entire app**, not just the landing state. It sits behind everything — hero, chat, input bar — for the full session.

**Component:** `flow-field-background.tsx` in `src/components/ui/`

**Config for this app:**
```tsx
<NeuralBackground
  color="#818cf8"      // indigo-400
  trailOpacity={0.12}  // slightly longer trails, calmer motion
  particleCount={500}  // lighter than default 600, keeps it subtle not busy
  speed={0.6}          // slow, ambient — not energetic or distracting
/>
```

**Two intensity states, same component, same session:**

- **Landing state** (before first message): full config above — this is the "wow" moment on load
- **Active chat state** (after first message sent): dim it, don't remove it — drop `trailOpacity` to `~0.06` and/or reduce canvas opacity via a wrapper `div` (`opacity-40` on the container) so it keeps running as ambient texture behind chat text without fighting readability. Transition between the two states with a **600ms CSS opacity change** on the wrapper, not by unmounting the component.

Reasoning: a full-intensity particle field behind live streaming text hurts readability and is a real CPU/battery risk on a shared venue laptop during a live demo. Dimming instead of removing keeps the ambient texture present while protecting demo reliability.

**Mount rules:**
- Mount the canvas **once** at the app root (`position: fixed`, behind all content via `z-index`), not per-page or per-view — it must never remount or restart as state changes within the single-page app
- No external animation library needed — plain Canvas API + `requestAnimationFrame`, zero new dependencies

---

## 1. Project setup

### 1.1 Scaffold with shadcn CLI (recommended starting point)

```bash
npx shadcn@latest init
```

Answer the prompts:
- Framework: **Vite** (React)
- TypeScript: **Yes**
- Tailwind CSS: **Yes** (the CLI installs and configures it)
- Base color: **Slate** (dark theme base)
- CSS variables for colors: **Yes**
- `components.json` alias `@/`: **Yes** — maps to `./src`

This produces:

```
frontend/
├── src/
│   ├── components/
│   │   └── ui/           ← shadcn drops primitives here; custom components go here too
│   ├── lib/
│   │   └── utils.ts      ← exports cn() (clsx + tailwind-merge)
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── tailwind.config.ts
├── tsconfig.json
└── components.json
```

> **Why `/components/ui` matters:** shadcn resolves `@/components/ui/*` by convention. The `cn()` helper and all primitive imports assume this path. Placing custom components here keeps the import alias consistent and lets shadcn primitives be composed directly without path gymnastics.

### 1.2 If you already have a Vite + React project without shadcn

```bash
# Add Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Add shadcn on top
npx shadcn@latest init

# Add the cn utility manually if not generated
npm install clsx tailwind-merge
```

Create `src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 1.3 Install remaining dependencies

```bash
npm install lucide-react geist
```

No other external runtime dependencies are needed — the flow-field background is pure Canvas API.

---

## 2. Component: `flow-field-background.tsx`

**Path:** `src/components/ui/flow-field-background.tsx`

A full-bleed animated canvas background. Particles follow a flow field derived from trigonometric noise and are repelled by the mouse cursor. Trails are created by drawing a semi-transparent overlay each frame instead of clearing the canvas.

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` | `string` | — | Extra Tailwind classes on the wrapper div |
| `color` | `string` | `"#6366f1"` | Particle color (any CSS color string) |
| `trailOpacity` | `number` | `0.15` | Alpha of the fade overlay per frame. Lower = longer trails |
| `particleCount` | `number` | `600` | Number of particles |
| `speed` | `number` | `1` | Flow field force multiplier |

**Does not accept `scale`** — the original demo snippet passes a `scale` prop that does not exist on the component; omit it.

**Source — `src/components/ui/flow-field-background.tsx`:**

```tsx
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface NeuralBackgroundProps {
  className?: string;
  /**
   * Color of the particles.
   * Defaults to a cyan/indigo mix if not specified.
   */
  color?: string;
  /**
   * The opacity of the trails (0.0 to 1.0).
   * Lower = longer trails. Higher = shorter trails.
   * Default: 0.1
   */
  trailOpacity?: number;
  /**
   * Number of particles. Default: 800
   */
  particleCount?: number;
  /**
   * Speed multiplier. Default: 1
   */
  speed?: number;
}

export default function NeuralBackground({
  className,
  color = "#6366f1", // Default Indigo
  trailOpacity = 0.15,
  particleCount = 600,
  speed = 1,
}: NeuralBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // --- CONFIGURATION ---
    let width = container.clientWidth;
    let height = container.clientHeight;
    let particles: Particle[] = [];
    let animationFrameId: number;
    let mouse = { x: -1000, y: -1000 }; // Start off-screen

    // --- PARTICLE CLASS ---
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      age: number;
      life: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = 0;
        this.vy = 0;
        this.age = 0;
        // Random lifespan to create natural recycling
        this.life = Math.random() * 200 + 100;
      }

      update() {
        // 1. Flow Field Math (Simplex-ish noise)
        // We calculate an angle based on position to create the "flow"
        const angle = (Math.cos(this.x * 0.005) + Math.sin(this.y * 0.005)) * Math.PI;

        // 2. Add force from flow field
        this.vx += Math.cos(angle) * 0.2 * speed;
        this.vy += Math.sin(angle) * 0.2 * speed;

        // 3. Mouse Repulsion/Attraction
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const interactionRadius = 150;

        if (distance < interactionRadius) {
          const force = (interactionRadius - distance) / interactionRadius;
          // Push away
          this.vx -= dx * force * 0.05;
          this.vy -= dy * force * 0.05;
        }

        // 4. Apply Velocity & Friction
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95; // Friction to stop infinite acceleration
        this.vy *= 0.95;

        // 5. Aging
        this.age++;
        if (this.age > this.life) {
          this.reset();
        }

        // 6. Wrap around screen
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = 0;
        this.vy = 0;
        this.age = 0;
        this.life = Math.random() * 200 + 100;
      }

      draw(context: CanvasRenderingContext2D) {
        context.fillStyle = color;
        // Fade in and out based on age
        const alpha = 1 - Math.abs((this.age / this.life) - 0.5) * 2;
        context.globalAlpha = alpha;
        context.fillRect(this.x, this.y, 1.5, 1.5); // Tiny dots are faster than arcs
      }
    }

    // --- INITIALIZATION ---
    const init = () => {
      // Handle High-DPI screens (Retina)
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    // --- ANIMATION LOOP ---
    const animate = () => {
      // "Fade" effect: Instead of clearing the canvas, we draw a semi-transparent rect
      // This creates the "Trails" look.
      // We use the background color of the parent or a dark overlay.
      // Assuming dark mode for this effect usually:
      ctx.fillStyle = `rgba(0, 0, 0, ${trailOpacity})`;
      ctx.fillRect(0, 0, width, height);

      particles.forEach((p) => {
        p.update();
        p.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    // --- EVENT LISTENERS ---
    const handleResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      init();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
        mouse.x = -1000;
        mouse.y = -1000;
    }

    // Start
    init();
    animate();

    window.addEventListener("resize", handleResize);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [color, trailOpacity, particleCount, speed]);

  return (
    <div ref={containerRef} className={cn("relative w-full h-full bg-black overflow-hidden", className)}>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
```

### 2.2 `demo.tsx` (usage reference)

> **Note:** the demo passes `scale={1}` which is not a prop on the component — it will be silently ignored. For this app use the config in the [Animated background](#animated-background) section instead of this default demo config.

**Source — `src/components/demo.tsx`:**

```tsx
import React from "react";
import NeuralBackground from "@/components/ui/flow-field-background";
import { ArrowRight, Sparkles } from "lucide-react";

export default function NeuralHeroDemo() {
  return (
    // Container must have a defined height, or use h-screen
    <div className="relative w-full h-screen">
      <NeuralBackground
            color="#818cf8" // Indigo-400
            scale={1}
            trailOpacity={0.1} // Lower = longer trails
            speed={0.8}
        />
    </div>
  );
}
```

---

## 3. App shell

The background mounts once as `position: fixed` at the root. The `isActive` state (true after first message) drives a CSS opacity transition on the wrapper from full to dimmed — the canvas never unmounts.

```tsx
// src/App.tsx
import React, { useState } from "react";
import NeuralBackground from "@/components/ui/flow-field-background";
import ChatPanel from "@/components/ChatPanel";
import Header from "@/components/Header";

export default function App() {
  const [isActive, setIsActive] = useState(false); // true after first message sent

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0A0A0B]">
      {/* Background: fixed, always mounted, dims after first message */}
      <div
        className="fixed inset-0 z-0 transition-opacity duration-[600ms]"
        style={{ opacity: isActive ? 0.4 : 1 }}
      >
        <NeuralBackground
          color="#818cf8"
          trailOpacity={0.12}
          particleCount={500}
          speed={0.6}
        />
      </div>

      {/* App content */}
      <div className="relative z-10 flex flex-col h-full">
        <Header />
        <ChatPanel onFirstMessage={() => setIsActive(true)} />
      </div>
    </div>
  );
}
```

---

## 4. Page layout (one page, two states)

Everything lives on a single page. There is no routing and no separate landing screen. The page has two visual states driven by whether the user has sent a first message yet.

**Before first message:** the persona picker, language picker, and input bar are all visible simultaneously. The background runs at full intensity. No "Start" CTA — the user just picks their settings and types.

**After first message:** persona and language controls move up to the header as compact chips; the center area becomes the scrolling message list. The background dims. This is a CSS/state transition, not a page change.

### 4.1 Before first message

Persona picker, language picker, and input bar are all visible at once. No separate landing screen or "Start" button.

```
┌─────────────────────────────────┐
│ Header: logo                    │  fixed, h-14
├─────────────────────────────────┤
│                                 │
│   [centered]                    │
│   app name + tagline            │
│                                 │
│   persona pills (3)             │  Never watched · Play FIFA · Tactics Nerd
│   language pills (3)            │  EN · FR · ES
│                                 │
├─────────────────────────────────┤
│ [img] [textarea] [send]         │  fixed, h-16, border-t #232326
└─────────────────────────────────┘
```

Background at full intensity. Typing and sending the first message triggers the transition to state 2.

### 4.2 After first message

Persona and language chips move to the header. Center area becomes the scrolling message list. Background dims (600ms CSS transition).

```
┌─────────────────────────────────┐
│ Header: logo · persona · lang   │  fixed, h-14, backdrop-blur-md, border-b #232326
│         · [mic]                 │
├─────────────────────────────────┤
│                                 │
│   message bubbles (scroll)      │  flex-1 overflow-y-auto px-4 py-6
│   · user: right-aligned         │  bg #131316, border #232326, radius 12px
│   · coach: left-aligned card    │  bg #131316, border #232326, radius 12px
│     left accent bar (3px)       │  color = intensity variant
│     + waveform when playing     │
│                                 │
│   pipeline state indicator      │  shown during generation, left-aligned
│   "thinking" / "checking live   │
│    data" / "writing commentary" │
│    / "generating audio"         │
│                                 │
├─────────────────────────────────┤
│ [img thumb] [textarea] [send]   │  fixed, h-16, border-t #232326, backdrop-blur-md
└─────────────────────────────────┘
```

### 4.3 Audio player states

Each coach message has an inline audio control. States:

- **Idle:** `<Play />` icon (lucide), muted text color
- **Loading:** spinner (CSS border-animation, 16px)
- **Playing:** `<Square />` stop icon + 3-bar waveform CSS animation in the message's intensity color
- **Error:** `<AlertCircle />` icon, `--text-muted` color

The waveform animation must be visible on a projector — size bars at minimum 3×12px, animate height with CSS keyframes in the intensity color.

### 4.4 Image upload

When a user attaches an image before sending, show a thumbnail (64×64px, rounded-lg, object-cover) inline in the input bar to the left of the textarea. An `×` button on the thumbnail clears it. On send, the thumbnail disappears and the image appears inside the user message bubble.

---

## 5. Voice orb

**Path:** `src/components/ui/voice-orb.tsx`

Canvas-based morphing orb that replaces the plain mic icon. Clicking it toggles voice input; the visual state updates to reflect what's happening.

**States:**

| State | What's happening | Visual |
|---|---|---|
| `idle` | mic off, waiting for tap | dim slow pulse, low amplitude |
| `listening` | mic open, user speaking | bright, fast morph + two expanding ring pulses |
| `processing` | audio sent, Gemini thinking | fast spin-morph, lighter purple |
| `speaking` | ElevenLabs audio playing | high-amplitude rhythmic beats, deep indigo |

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `state` | `OrbState` | required | `"idle" \| "listening" \| "processing" \| "speaking"` |
| `onClick` | `() => void` | — | Tap handler — toggle listening on/off |
| `size` | `number` | `120` | Width and height in px |
| `className` | `string` | — | Wrapper classes |

**Usage in `AudioPlayer.tsx` or wherever the mic lives:**

```tsx
import VoiceOrb, { OrbState } from "@/components/ui/voice-orb";

const [orbState, setOrbState] = useState<OrbState>("idle");

<VoiceOrb
  state={orbState}
  size={96}
  onClick={() => {
    if (orbState === "idle") {
      setOrbState("listening");
      startRecording(); // kick off ElevenLabs Scribe STT
    } else {
      setOrbState("idle");
      stopRecording();
    }
  }}
/>
```

Wire `setOrbState("processing")` when you fire the `/chat` request, and `setOrbState("speaking")` when the `/speak` audio starts playing. Reset to `"idle"` when audio ends.

**Note:** the animation loop runs once on mount and reads state via a ref — no restarts on state change, no jank.

---

## 5. shadcn primitives to add

```bash
npx shadcn@latest add button
npx shadcn@latest add textarea
npx shadcn@latest add badge
npx shadcn@latest add separator
npx shadcn@latest add scroll-area
```

`Badge` — persona chip and language chip in the header
`ScrollArea` — chat message list with styled scrollbar
`Textarea` — auto-resize input bar

---

## 6. Responsive behavior

- Mobile-first. The chat panel must be usable one-handed on a phone (judges will try it on their own devices).
- Particle count drops to `300` on screens narrower than `640px` to maintain 60fps on phones — detect via a `useWindowSize` hook.
- Persona/language pickers collapse into a single-row scrollable chip strip on mobile.
- All interactive touch targets minimum `44px`.
- Audio playback is the primary mobile interaction — the play/waveform control is the most prominent element on each coach card.

---

## 7. What NOT to do

- No numbered step markers (01 / 02 / 03) — nothing in this UI is a sequential process
- No stock sports photography, no ball/jersey iconography
- No more than one accent hue at full saturation on screen at once — the calm/building/explosive variants are the exception, and only one ever appears at a time per message
- No shadows as depth — use the hairline border system instead, consistent with the Vercel/Linear reference
- No heavy font weights (700+) — 600 is the ceiling

---

## 8. File structure (frontend)

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── flow-field-background.tsx   ← copy-pasted component
│   │   │   ├── button.tsx                  ← shadcn generated
│   │   │   ├── badge.tsx                   ← shadcn generated
│   │   │   ├── textarea.tsx                ← shadcn generated
│   │   │   ├── scroll-area.tsx             ← shadcn generated
│   │   │   └── separator.tsx               ← shadcn generated
│   │   ├── ChatPanel.tsx
│   │   ├── Header.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── PersonaPicker.tsx
│   │   └── AudioPlayer.tsx
│   ├── lib/
│   │   └── utils.ts
│   ├── hooks/
│   │   └── useChat.ts        ← fetch wrapper for /chat, manages history[]
│   ├── App.tsx
│   └── main.tsx
├── tailwind.config.ts
├── tsconfig.json
└── components.json
```
