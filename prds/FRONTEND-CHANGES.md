# Frontend Changes

**Last updated:** July 11, 2026
**Scope:** Landing page, home navigation, and the frontend halves of F3–F9
**Related docs:** [PRD-worldcup-companion.md](PRD-worldcup-companion.md) · [BACKEND-CHANGES.md](BACKEND-CHANGES.md) · [PROJECT-STATUS.md](PROJECT-STATUS.md)

---

## 1. Home landing page

Before this work, `App.tsx` rendered only the flow-field particle background (left over from the "testing out a new ui" commit) — none of the existing chat components were mounted. The landing page is now fully composed.

### What was added

| File | Change |
|---|---|
| [frontend/src/App.tsx](frontend/src/App.tsx) | Composes the full app: particle background, `Header`, `ChatPanel`, persona/language state, and the `useChat` hook. Includes a `LandingBackground` wrapper component. |
| [frontend/src/lib/types.ts](frontend/src/lib/types.ts) | New `SUGGESTED_PROMPTS` constant — four starter questions per language (EN/FR/ES). |
| [frontend/src/components/ChatPanel.tsx](frontend/src/components/ChatPanel.tsx) | Landing hero enlarged (title bumped to `text-3xl/4xl`) and suggested-prompt chips added below the pickers; clicking a chip sends it as a message. |

### Design decisions (confirmed)

- **Particle color:** brand green `#00e58c` (was indigo `#6366f1`), matching the app's accent so the landing feels cohesive.
- **Landing scope:** hero + persona/language pickers + suggested question chips. The chips map to the PRD demo script — offside (F1), VAR, a live-data grounding question ("Who does Canada play next?", F4), and a tactics explainer.
- **Background lifecycle:** landing only. `LandingBackground` fades the particles out over 700 ms when the first message is sent, then **unmounts** the canvas so the `requestAnimationFrame` loop stops burning frames behind the chat. It fades back in when the user returns home.
- **Prompt chips are language-aware:** switching to FR/ES swaps the chips to native phrasing, including correct soccer terminology (*hors-jeu*, *fuera de juego*) per PRD F2.
- **Mobile perf:** particle count drops from 600 to 300 below 640 px width (kept from the original background test).

## 2. Logo → home with confirmation

During an active chat, clicking the **FootyIQ logo** in the header returns the user to the landing page, guarded by a confirmation dialog.

### What was added

| File | Change |
|---|---|
| [frontend/src/components/ConfirmDialog.tsx](frontend/src/components/ConfirmDialog.tsx) | **New** reusable themed modal: dimmed/blurred backdrop (click to dismiss), Escape to cancel, autofocus on the primary action, `role="dialog"` + `aria-modal` + labelled title. |
| [frontend/src/components/Header.tsx](frontend/src/components/Header.tsx) | Logo is now a button firing `onHomeClick`. Disabled on the landing page itself; pointer cursor + hover effect only while a chat is active. |
| [frontend/src/hooks/useChat.ts](frontend/src/hooks/useChat.ts) | New `resetChat()` — clears messages **and** cancels in-flight pipeline timers so a pending "thinking…" indicator can't leak onto a fresh landing page. |
| [frontend/src/App.tsx](frontend/src/App.tsx) | Holds `confirmingHome` state; logo click → dialog → `resetChat()` on confirm. |

### Design decisions (confirmed)

- **Confirming clears the conversation** (session-only, matching the PRD's no-persistence model) — that's why the confirmation exists. "Stay" preserves everything.
- **Styled in-app modal** rather than native `window.confirm()` — looks polished for judges/demo.
- Because `isActive` derives from `messages.length`, clearing messages automatically restores the hero and fades the particle background back in — no separate routing/screen state.

## 3. Verification performed

- `npm run build` (tsc + vite) passes cleanly.
- Headless-Chrome screenshot confirmed the landing renders: header, hero, pickers, prompt chips, input bar, green particles.
- Scripted browser run (playwright-core against installed Chrome) verified the full navigation loop: send message → chat active → logo click → dialog appears → "Stay" preserves chat → "Go home" clears chat and lands on the hero.

## 4. Things to note / open items

- **No backend yet.** Sending a message hits `POST /chat`, which 502s; the UI shows the graceful fallback ("I couldn't reach the coaching desk…"). Next step is the FastAPI scaffold with a stub `/chat`.
- **Vite proxy needed.** When the backend exists, add proxy entries in [frontend/vite.config.ts](frontend/vite.config.ts) for `/chat`, `/speak`, and `/transcribe` pointing at the FastAPI port.
- **Pipeline indicator is cosmetic.** The "thinking → checking live data → writing commentary → generating audio" states advance on fixed 1.8 s timers in `useChat.ts`, not real backend progress. Revisit once `/chat` streams.
- **Going home wipes session context.** Consistent with the PRD today, but if F10's backend session memory (session-id-keyed dict) is added later, `resetChat()` should also rotate the session id so the backend forgets too.
- **Suggested prompts are hardcoded.** If demo questions change (e.g., rehearsed grounding questions morning-of), update `SUGGESTED_PROMPTS` in `types.ts`.
- **Hero copy is English-only.** The title/tagline ("Your coach in your pocket…") doesn't yet translate when FR/ES is picked — only the prompt chips do. Small follow-up if full FR/ES landing is wanted.
- **Confirm dialog focus is minimal.** Focus moves to the primary button on open, but there's no full focus trap (Tab can reach elements behind the modal). Fine for a hackathon; note for the F7 accessibility pass.

---

## 5. Feature-work additions (F3–F9)

### F3 — Client-side image downscaling
[ChatPanel.tsx](frontend/src/components/ChatPanel.tsx): images over 1280px on the long edge are canvas-resized and re-encoded as JPEG (quality 0.85) before upload; smaller images pass through untouched. Phone screenshots drop from multiple MB to well under 100 KB of payload. (Fine print: flat-color synthetic graphics can come out slightly *larger* as JPEG — the win is on real photos/screenshots.)

### F4 — Grounding sources row
[MessageBubble.tsx](frontend/src/components/MessageBubble.tsx): coach messages with Google-Search-grounded answers show a compact "sources" row (accent-colored links, hairline top border). Ungrounded answers render exactly as before. `Source {title, url}` added to [types.ts](frontend/src/lib/types.ts) and passed through [useChat.ts](frontend/src/hooks/useChat.ts).

### F7 — Accessibility pass
- **Larger-text toggle**: `aA` button in the [Header](frontend/src/components/Header.tsx), visible on landing and in chat. Scales root font 16px→20px; the whole rem-based UI follows. `aria-pressed` tracked.
- **Reduced motion**: `prefers-reduced-motion: reduce` skips the particle canvas entirely (never mounts).
- **Screen readers**: the chat list is an `aria-live="polite"` region — coach replies are announced on arrival.
- **Keyboard**: global accent `:focus-visible` ring in [index.css](frontend/src/index.css).

### F8 — Voice input (hands-free loop)
- Mic button in the input bar ([ChatPanel.tsx](frontend/src/components/ChatPanel.tsx)): tap to record (red pulsing stop square), tap to stop → clip POSTs to `/transcribe` → transcript sent as a chat message flagged `voice: true`. Error state on mic-permission denial or STT failure.
- Replies to voice questions carry `autoSpeak` ([types.ts](frontend/src/lib/types.ts), [useChat.ts](frontend/src/hooks/useChat.ts)) and the [AudioPlayer](frontend/src/components/AudioPlayer.tsx) auto-plays them on arrival. Typed questions still require a manual play tap.

### F9 — Hype generator UI
⚡ button beside the mic opens a popover ([ChatPanel.tsx](frontend/src/components/ChatPanel.tsx)): team input + "Match preview" / "Trash talk" buttons, localized EN/FR/ES via `HYPE_UI` / `HYPE_LABELS` in [types.ts](frontend/src/lib/types.ts). `sendHype` in [useChat.ts](frontend/src/hooks/useChat.ts) posts to `/hype` and the result lands in the chat as a normal coach message (intensity color, sources, playback all work for free).

### Infrastructure
- **Vite proxy uses `127.0.0.1`, not `localhost`** ([vite.config.ts](frontend/vite.config.ts)): on Windows, `localhost` resolves IPv6-first and costs a flat ~2s per proxied request when the backend listens on IPv4 only. `/hype` added to the proxy list.
- Note: Vite v8 binds the dev server itself to `::1` — open the app via `http://localhost:<port>`, not `http://127.0.0.1:<port>`.
