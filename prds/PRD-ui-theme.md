# PRD: Pitchside UI — Broadcast Theming Pass

**Purpose:** make the chrome as football as the content — broadcast-style touches on the existing glass aesthetic, plus visible-defect fixes
**Direction (confirmed):** broadcast touches, not a full stadium skin; branding split (Pitchside UI / FootyIQ repo) intentionally left as-is
**Status:** Draft v1.0 · July 12, 2026
**Baseline:** all v1 + standout features (S1–S7) live in production

---

## 1. Review findings

**Strengths to preserve:** the glass panels/chips, the voice orb, coach avatars with real personality, the indigo particle field, dark/light parity. Nothing here should be redesigned — only layered on.

**The gap:** between the logo and the avatars, no pixel says *football*. The theme lives entirely in the content (answers, diagrams, voices). Judges glancing at the screen see a generic — if handsome — AI chat.

**Defects found during review (fix regardless of theming):**
| # | Defect | Where |
|---|---|---|
| D1 | Logo renders in a visibly mismatched box in light mode (image background ≠ `--bg`) | header, light theme |
| D2 | Hero title/tagline stay English when FR/ES is selected (chips/placeholders localize; the hero doesn't) | landing |
| D3 | Intensity system is invisible — the redesign dropped the colored bubble borders, so `calm/building/explosive` only affects audio | chat bubbles |
| D4 | No `og:title` / `og:description` / `og:image` / `twitter:card` meta — a shared link (judges *will* share it) unfurls as a bare URL | index.html |
| D5 | Backend still returns English error hints ("Transcription failed — type your message instead.") regardless of UI language | ChatPanel mic flow |

## 2. Features (build-priority order)

### T1. Soccer loading phrases — *smallest, do first (~30 min)*
Replace the generic "Thinking / Generating" pipeline states with rotating, localized broadcast phrases:
- EN: "Checking with VAR…", "Consulting the bench…", "Reading the game…", "Warming up…"
- FR: "Consultation de la VAR…", "On consulte le banc…", …
- ES: "Consultando el VAR…", "Mirando al banquillo…", …
- *Build:* extend the `PIPELINE_STEPS` mechanism in `useChat.ts` + a phrase table in `types.ts`; keep the existing shimmer styling.
- *Accept:* phrases rotate during generation and match the selected language.

### T2. Card-style intensity cues — *restores D3 with a football metaphor (~1 h)*
`building` answers get a small **yellow card** chip beside the coach name; `explosive` gets a **red card** chip (a 10×14px rounded rect — instantly readable to any football fan). `calm` shows nothing.
- *Build:* small inline SVG in `MessageBubble.tsx`, driven by the already-present `message.intensity`.
- *Accept:* a hype reply shows the red card; a rules answer shows no chip; colors read in both themes.

### T3. Coach identity rings — *reinforces three-coaches-three-voices (~1 h)*
Each coach gets a signature color: El Pocho **sky blue** `#38bdf8` · The Special One **crimson** `#ef4444` · El Maestro **teal** `#2dd4bf`. Used in exactly two places: a 2px avatar ring and the coach-name label tint. Nowhere else, so the indigo glass identity stays dominant.
- *Build:* extend the `COACH` map in `MessageBubble.tsx` with a `color` field.
- *Accept:* switching persona visibly changes the ring/label color on new replies; old replies keep their original coach's color (persona is already stored per message).

### T4. Match-day ticker — *the flagship of this pass (~3–4 h)*
A slim broadcast-style strip on the landing page under the tagline: `⚽ TONIGHT · FRANCE v SPAIN · SEMIFINAL · DALLAS`, sourced from real grounded data.
- *Build:*
  - Backend: `GET /ticker?language=` → `{headline}`. One grounded Flash call ("in ≤10 words, the single most important upcoming/current 2026 World Cup fixture"), **cached in-memory for 30 min** (module-level timestamp) so the landing page never adds per-visit Gemini cost or latency.
  - Frontend: fetch on landing mount; render as a glass hairline strip with a subtle pulse dot; **render nothing on error/timeout** — the ticker must never block or degrade the landing.
  - Vite proxy + `vercel.json` rewrite for `/ticker`.
- *Accept:* landing shows a current, real fixture within ~1s (cached) in the selected language; killing the backend leaves the landing visually intact.

### T5. Pitch-line hero backdrop — *quiet theme signal (~1 h)*
A faint center-circle + halfway-line motif behind the hero title (SVG at ~4–6% opacity, theme-aware), echoing the pitch markings already in the whiteboard component. Static, no animation, invisible-until-noticed by design.
- *Accept:* visible on close look in both themes; text contrast unaffected; reduced-motion unaffected (it's static).

### T6. Defect fixes (bundled, ~1–2 h total)
- **D1**: export/replace logo PNGs with transparent backgrounds (or set the img background to transparent via CSS mask); verify against both themes.
- **D2**: localize the hero tagline ("Ton coach de poche pour la Coupe du monde 2026" / "Tu entrenador de bolsillo para el Mundial 2026"); the wordmark "Pitchside" stays untranslated.
- **D4**: add OG/Twitter meta to `index.html` (title, description, `pitchside-qr.png`-style social image or a screenshot, `theme-color` already present).
- **D5**: move mic-flow error strings into the localized tables in `types.ts`.

## 3. Explicitly out of scope
- Team-color adaptive accents from the S7 allegiance (fun, but conflicts with the "accents stay minimal" decision and risks ugly combinations).
- Crowd-noise ambiance under hype playback (audio layering complexity; the multi-delivery S5 performance already owns that moment).
- Full stadium skin / pitch-green surfaces (rejected in direction question).
- Renaming repo/URL/backend references (confirmed leave-as-is).

## 4. Suggested order & cut line

| Time available | Ship |
|---|---|
| ~1 h | T1 + D2 + D5 (all copy/table work) |
| ~3 h | + T2 + T3 + D1 + D4 |
| ~6–7 h | + T4 (ticker) + T5 (backdrop) |

T4 is the only item with backend surface; everything else is frontend-only and individually committable. All are safe to ship feature-by-feature — none touches the demo-critical voice/chat paths.

## 5. Risks
| Risk | Mitigation |
|---|---|
| Ticker returns a stale/odd headline at demo time | 30-min cache means one bad generation lingers — add a `?refresh=1` dev param; verify morning-of alongside the grounding questions |
| Card chips read as errors/warnings to non-fans | Pair the card glyph with the word ("building"/"explosive" localized) in a tooltip; visual is primary, tooltip disambiguates |
| Coach colors clash with light mode | Pick from Tailwind's 400-range (tested above), verify both themes before commit |
| More UI churn before judging | Same rule as before: hard feature freeze 6 h pre-demo; each T-item is an independent commit that can be skipped |
