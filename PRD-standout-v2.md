# PRD: Pitchside v2 — Standout Features for Judging

**Project:** Pitchside (AI World Cup Companion)
**Purpose:** Post-v1 review — what to add/improve so the project stands out to CUhackathon judges
**Prize tracks:** Best Use of Gemini API · ElevenLabs integration
**Status:** Draft v1.0 · July 12, 2026
**Baseline:** All v1 features (F1–F10) shipped and verified — see [PROJECT-STATUS.md](PROJECT-STATUS.md)

---

## 1. Where the project stands with judges

**Already strong:**
- Full Gemini story: personas via system prompt, native trilingual, image understanding, model-routed search grounding with visible citations, Pro/Flash routing.
- Full ElevenLabs story: intensity-mapped TTS, multilingual audio, Scribe STT, complete hands-free loop, audio caching.
- Polished UI (coach avatars, orb, themes) — most hackathon teams demo raw HTML.

**Where judges will see gaps:**
1. **One voice for three coaches.** The UI shows Pep, José, and Poch avatars — but they all speak with the same George voice. The mismatch is visible on screen.
2. **The voice loop is one-shot.** Ask → answer → dead air. A real "coach in your pocket" keeps the conversation going.
3. **Nothing on the judges' own phones yet.** Localhost-only demos score categorically lower than "scan this QR."
4. **Drama is flat within an answer.** Intensity changes *between* answers, not *within* one — the original F5 vision (a goal-scramble line delivered differently from a tactics line) is still deferred.
5. **Explanations are words-only.** For tactics questions, everyone else will also show text. Nobody will show a *diagram*.

## 2. Feature proposals (build-priority order)

### P0 — Highest impact per hour (do these first)

**S1. Three coaches, three voices**
Map each persona to a distinct stock ElevenLabs voice *and* a coach personality in the Gemini system prompt (warm teacher / banter-loving pundit / clinical analyst). The avatars already exist — this makes them real.
- *Build:* voice-ID map in `config.py` keyed by persona; `/speak` accepts persona; persona flavor lines in `gemini_client.py`. The frontend already passes persona on messages.
- *Acceptance:* switching persona audibly changes who is talking; the same question answered by two coaches differs in voice **and** verbal personality.
- *Effort:* ~2 h. *Prize angle:* deepens BOTH tracks at once.

**S2. Deploy + QR code (from v1 PRD, now urgent)**
Vercel (frontend) + Render/Railway (backend, env-var keys). Print/display a QR code; judges try it on their own phones in any of three languages.
- *Acceptance:* cold URL → working chat + voice on a judge's phone; backend warm-pinged before judging.
- *Effort:* ~2–3 h incl. debugging CORS/cold starts. *Risk mitigation:* localhost fallback remains.

**S3. Point-your-camera-at-the-TV**
On phones, the image input opens the camera directly (`capture="environment"` on the file input — the downscaling pipeline already handles the rest). Demo: point phone at a paused VAR freeze-frame on the TV, ask "why was this disallowed?"
- *Acceptance:* phone camera → photo → correct grounded explanation, one tap.
- *Effort:* ~30 min + testing. Depends on S2 for the on-phone demo.

### P1 — Differentiators

**S4. Coach Call (continuous conversation mode)**
After a spoken reply finishes, the mic automatically re-opens (orb returns to listening) — a true back-and-forth phone call with your coach until the user hangs up. One state machine on top of the existing loop; no new endpoints.
- *Acceptance:* three-turn spoken conversation with zero touches between turns; explicit hang-up control; never listens outside an active call.
- *Effort:* ~3 h. *Prize angle:* the ElevenLabs "wow" — most teams stop at one-shot TTS.

**S5. Dramatic multi-voice commentary (finish original F5)**
For hype content and `explosive` answers, Gemini already writes the script — extend it to tag each line with intensity, then stitch per-line TTS (different stability/style per line) into one MP3 server-side.
- *Acceptance:* a hype preview audibly builds: calm open → building middle → explosive finish, in one playback.
- *Effort:* ~3–4 h (MP3 concatenation is trivial; prompt + cache-key changes). *Prize angle:* ElevenLabs settings used expressively, not just called.

**S6. Tactical whiteboard**
For formation/tactics questions, Gemini returns (alongside the text) a small JSON of player positions/arrows via structured output; the frontend renders it as an animated SVG pitch diagram in the bubble. "Explain a 4-3-3" → you *see* the 4-3-3.
- *Acceptance:* at least 3 rehearsed tactics questions render correct, legible diagrams; non-tactics questions are unaffected.
- *Effort:* ~4–6 h (the riskiest item — timebox it). *Prize angle:* Gemini structured output + a visual no other team will have.
- *Note:* run as a **separate second Gemini call** so it can't break the main chat path (and can't collide with grounding's JSON-mode citation issue).

### P2 — Polish / stretch

**S7. Visible session memory.** When the model detects a team preference, show a small "Supporting: Morocco 🇲🇦" chip near the composer. Makes the invisible F10 memory demoable in one glance. (~1–2 h; needs a lightweight extraction step — piggyback on the intensity tag line.)
**S8. Streaming text.** Token streaming into the bubble for perceived speed. Touches `useChat` + backend SSE; do only if time remains (~3 h).
**S9. Shareable hype card.** Render trash-talk as a styled image (canvas) with team colors + "Made with Pitchside" for the group chat. (~2 h; pure frontend.)

### Quick fixes (do regardless, <30 min total)
- Swap the "Who does Canada play next?" suggested chip for a live-bracket question ("Who plays in the next semifinal?") — Canada is eliminated; the current chip demos grounding with a downer.
- Pre-cache the rehearsed demo lines on the deployed backend the morning of judging (play each once).
- Rotate the Gemini API key before demo day (it appeared in a chat session once).

## 3. Recommended cut line

Time realistically available before judging decides the cut:

| Hours available | Ship |
|---|---|
| ~4 h | Quick fixes + S1 + S3 |
| ~8 h | + S2 (deploy) + S4 (Coach Call) |
| ~14 h | + S5 (multi-voice drama) **or** S6 (whiteboard) — not both |
| More | + remaining P2 items by taste |

S1 before everything: it is the cheapest feature with the largest on-stage effect, and it upgrades every other demo moment (the whiteboard explained by José's voice, the Coach Call with Pep).

## 4. Demo script changes (3-minute version)

1. Hook (unchanged, 20 s).
2. **Persona demo becomes a voice demo (40 s):** same question to Pep → then José — different structure *and* different voice/personality. (S1)
3. **Camera moment (30 s):** point the phone at the offside freeze-frame on the laptop screen. (S3)
4. Grounding (25 s): "Who plays in the next semifinal?" — cited, current.
5. **Coach Call in French (40 s):** hands-free two-turn conversation, phone flat on the table. (S4, F2, F8)
6. **Whoa closer (25 s):** one-tap hype preview that audibly builds to explosive. (S5)
7. Close (10 s): "Two APIs. One coach. Scan the QR." (S2)

## 5. Risks

| Risk | Mitigation |
|---|---|
| Deploy surprises (CORS, cold start, env keys) | Do S2 early, not last; keep localhost fallback; warm-ping before judging |
| Multi-voice stitching produces audible seams | Acceptable at hackathon fidelity; fall back to single-voice if jarring |
| Whiteboard JSON is unreliable for arbitrary questions | Scope to rehearsed questions; hide the feature behind detection, never block text |
| Auto-listen (S4) triggers on ambient noise | Reuse the annotation filter; require hang-up state machine; test in a noisy room |
| New features destabilize working v1 before judging | Feature-by-feature commits; hard cut line 6 h before demo; rehearse on the deployed build only |

## 6. Success criteria

- A judge uses the app on their own phone within 20 seconds of seeing the QR code.
- Persona switch produces an audibly different coach without explanation needed.
- At least one moment in the 3-minute demo gets an audible reaction (target: S4 or S5).
- Zero features regress from v1 — the feature matrix in PROJECT-STATUS.md still passes end-to-end on the deployed build.
