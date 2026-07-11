# Product Requirements Document: Coach in Your Pocket

**Project:** AI World Cup Companion
**Event:** CUhackathon 2026, Carleton University
**Challenge track:** Best Use of Gemini API (Google) · ElevenLabs integration
**Date:** July 2026
**Status:** Draft v1.0

---

## 1. Overview

Coach in Your Pocket is a personalized, multilingual, voice-enabled AI companion for the 2026 FIFA World Cup. It explains what is happening in the tournament — rules, tactics, refereeing decisions, fixtures — at whatever level of soccer knowledge the user has, in English, French, or Spanish, in text or in a dramatic spoken commentator voice.

The app pairs the Google Gemini API (reasoning, translation, multimodal image understanding, and Google Search grounding for live tournament data) with the ElevenLabs API (text-to-speech commentator voices and Scribe speech-to-text) in a clean two-API pipeline: Gemini writes, ElevenLabs performs.

## 2. Problem statement

The 2026 World Cup — hosted by Canada, the US, and Mexico — is pulling in millions of first-time and casual viewers. Many of them do not understand offside, VAR, formations, or why a goal was just disallowed. Existing resources (Wikipedia, Reddit, broadcast commentary) assume prior knowledge, are not personalized, and are not conversational. Casual fans are left confused mid-match, and the moment passes before they can find an answer.

**Who feels this:** the parent watching because Canada qualified, the friend dragged to a watch party, the FIFA-video-game player who has never watched a full 90 minutes, and non-anglophone fans in a bilingual host country.

## 3. Goals and non-goals

### Goals
1. Answer any soccer/World Cup question at the user's chosen expertise level.
2. Support English, French, and Spanish in both text and audio.
3. Accept text, screenshots, and voice as input.
4. Ground live-tournament answers (fixtures, results, standings) in real search data — never hallucinated.
5. Deliver a memorable "whoa" demo moment: a spoken, stadium-style commentator explanation.

### Non-goals
- Live video analysis of broadcast streams (out of scope for a weekend).
- Betting advice or odds.
- Voice cloning of real commentators (IP/likeness risk — stock ElevenLabs voices only).
- User accounts, persistence, or production hardening.

## 4. Target users and personas

| Persona | Description | Primary need |
|---|---|---|
| **The New Fan** ("my mom") | Started watching because Canada qualified; knows nothing | Plain-language answers, zero jargon |
| **The Casual** | Plays FIFA/EA FC, watches highlights | Mid-level tactical context, slang OK |
| **The Tactics Nerd** | Watches weekly, reads analysis | Depth: xG, pressing structures, scouting language |
| **The Francophone/Hispanophone fan** | Prefers French or Spanish | Full experience in their language, spoken aloud |
| **The Hands-Busy fan** | Cooking during the match, driving to a watch party, or low-vision | Voice-in, voice-out interaction |

## 5. Features (build-priority order)

### P0 — Core (must ship)

**F1. Persona-based explanations**
User selects a knowledge level: *Never watched* → *Play FIFA sometimes* → *Tactics nerd*. The level is injected into the Gemini system prompt and produces structurally different answers — not just simpler or fancier wording of the same content:
- **New Fan** receives an analogy-based explanation that maps the concept to everyday life (e.g., offside explained as a "being behind the last defender is like cutting in line at the wrong moment").
- **Casual** receives a short tactical note that names what happened and why it matters for the game-plan, without deep stats.
- **Tactics Nerd** receives an answer that references an actual stat or analytical concept (xG, pressing intensity, defensive line height, etc.) relevant to the moment being explained.
- *Acceptance:* the same question ("why was that goal disallowed for offside?") produces three answers that differ in **structure** — one is analogy-led, one is tactical-note format, one cites a measurable concept — not merely in vocabulary complexity.

**F2. Multilingual mode**
User selects English, French, or Spanish; all responses are generated in that language natively by Gemini (not post-translated).
- *Acceptance:* full conversation flows correctly in FR and ES, including soccer terminology (hors-jeu, fuera de juego).

**F3. "Explain this moment" (multimodal)**
User pastes a headline/match report or uploads a screenshot (e.g., a freeze-frame with an offside line). Gemini's image understanding breaks down what happened.
- *Acceptance:* an offside freeze-frame screenshot yields a correct, level-appropriate explanation of the ruling.

### P1 — Differentiators (should ship)

**F4. Live context via Google Search grounding**
The Gemini call exposes the Google Search grounding tool as a callable function. Gemini decides autonomously — via tool/function calling — when a query requires live data and invokes search accordingly. There is no keyword matching on the client or backend side; the model determines whether grounding is needed based on the question's intent.
- *Acceptance:* (a) a simple live-data lookup ("who do they play next?") returns the correct, verifiable current answer with grounding metadata; (b) a reasoning question that requires grounded data ("should we be worried about the next opponent?") also triggers grounding and produces an answer that reasons over the retrieved context, not just quotes it.
- *Demo/test question set must include at least one of each type.*

**F5. Commentator voice output (ElevenLabs TTS)**
Any answer can be played aloud. Gemini writes a commentary-style script and tags each line with an emotional intensity level — *calm*, *building*, or *explosive* — based on what is happening in the moment being described. Those tags drive the ElevenLabs call: each intensity level maps to distinct voice `style` and `stability` settings rather than a single flat delivery. A goal-mouth scramble line is delivered differently from a tactical explanation.
- *Acceptance:* one-tap playback of a dramatic spoken explanation, < 4 s to first audio for cached lines; a multi-line response audibly shifts in delivery across intensity levels.

**F6. Multilingual audio**
ElevenLabs' multilingual model speaks the French and Spanish responses naturally.
- *Acceptance:* a French text answer plays back in fluent French audio.

**F10. In-session memory**
No accounts or persistence — session only. If the user mentions a team preference, language preference, or any other meaningful context earlier in the conversation, the app carries that forward and references it naturally in later responses (e.g., if the user says "I'm supporting Morocco" early on, a later unprompted question gets a Morocco-aware answer without the user repeating themselves).
- *Acceptance:* a stated team preference in message 1 is correctly referenced in a relevant response three or more turns later, without the user repeating it.
- *Technical note:* this reuses the existing `history` param already being passed to `/chat` — no new database or infrastructure is needed. If more reliability is wanted, an in-memory dict on the FastAPI backend keyed by session id can hold a small set of structured fields (e.g., `team`, `language`, `level`) that are injected into the system prompt on each turn.

### P2 — Stretch goals

**F7. Accessibility framing / hands-free mode**
Voice output positioned and tested as an accessibility feature (low-vision users, hands-busy contexts). Includes larger-text UI toggle.

**F8. Voice input (ElevenLabs Scribe STT)**
User taps the mic and asks aloud ("WHY WAS THAT OFFSIDE?"); Scribe transcribes → Gemini answers → TTS speaks the reply. Full hands-free loop.
- *Acceptance:* spoken question round-trips to spoken answer with no keyboard use.

**F9. Hype content generator**
One-tap generation of a dramatic match preview or group-chat-ready trash-talk message for a chosen team, optionally voiced.

## 6. User stories

1. As a new fan, I want to ask "what just happened?" in plain English so I can follow the match my family is watching.
2. As a casual fan, I want to upload a screenshot of a VAR decision so I can understand why the goal was disallowed.
3. As a francophone fan, I want the whole experience in French, spoken aloud, so the app feels native to me.
4. As a hands-busy fan, I want to ask a question by voice and hear the answer so I never touch my phone during cooking.
5. As any fan, I want fixture and result questions answered with real current data so I can trust the app.
6. As a fan at a watch party, I want a hype intro read in a commentator voice so I can entertain my friends.

## 7. System architecture

```
┌─────────────────────────────┐
│   Web app (React)           │  chat UI · persona picker · language picker
│                             │  image upload · mic button · audio player
└──────────────┬──────────────┘
               │ REST (JSON / multipart)
┌──────────────▼──────────────┐
│ Backend orchestrator        │  prompt builder · session state
│ (FastAPI, Python)           │  API keys · audio cache
└──────┬───────────────┬──────┘
       │               │
┌──────▼──────┐  ┌─────▼───────────┐
│ Gemini API  │  │ ElevenLabs API  │
│ · reasoning │  │ · TTS (multi-   │
│ · translate │  │   lingual)      │
│ · vision    │  │ · Scribe STT    │
│ · grounding │  └─────────────────┘
└──────┬──────┘
┌──────▼──────────────┐
│ Google Search       │
│ grounding tool      │
└─────────────────────┘
```

### Backend endpoints

| Endpoint | Method | Input | Output | Powers |
|---|---|---|---|---|
| `/chat` | POST | message, persona, language, optional base64 image, history | streamed text answer | F1–F4 |
| `/speak` | POST | text, voice style, language | audio (MP3) | F5–F7 |
| `/transcribe` | POST | audio blob | transcript text | F8 |

The voice loop (F8) is `/transcribe` → `/chat` → `/speak` chained client-side — no new architecture.

### Repo layout

```
worldcup-companion/
├── backend/
│   ├── main.py            # FastAPI routes
│   ├── gemini_client.py   # prompt builder, grounding config
│   ├── eleven_client.py   # TTS + Scribe wrappers, audio cache
│   ├── config.py          # models, voices, defaults
│   └── local_config.py    # API keys (gitignored)
└── frontend/              # React: chat, pickers, mic, player
```

### Key technical decisions
- **System prompt as the personalization engine.** Persona + language are prompt parameters, not separate models — one Gemini integration covers F1–F4.
- **Grounding via model-driven tool calling.** The Google Search grounding tool is exposed as a callable function; Gemini decides autonomously whether to invoke it based on the question's intent. No keyword matching (e.g., "today", "next") on the client or backend — the model is the router. This keeps latency low for rule explanations while correctly handling implicit live-data needs (e.g., "should we be worried about the next opponent?" triggers grounding without containing any time-keywords).
- **Audio caching.** MP3s keyed by hash(text, voice) and stored on disk. Rehearsed demo lines play instantly, protecting both latency and the ElevenLabs free-tier character quota.
- **Stock voices only.** No cloning of real commentators; dramatic *writing style* comes from Gemini, not from imitating a person.

## 8. Demo plan (3 minutes)

1. **Hook (20 s):** "My mom started watching the World Cup because Canada qualified. She had no idea what was going on. So we built her a coach."
2. **Persona demo (45 s):** ask "why was that goal disallowed for offside?" at all three levels — show the answers diverge.
3. **Multimodal demo (40 s):** upload an offside freeze-frame screenshot; Gemini explains the ruling from the image.
4. **Grounding demo (30 s):** "Who plays in the next quarterfinal?" — live, correct, cited answer.
5. **The whoa moment (30 s):** switch to French, tap play — dramatic spoken French commentary via ElevenLabs.
6. **Stretch, if built (15 s):** yell "WHY WAS THAT OFFSIDE?" at the phone; spoken answer comes back.
7. **Close (10 s):** one Gemini integration powering five features + grounding + multimodal; one ElevenLabs integration powering voice out and in.

## 9. Success metrics (hackathon framing)

- All three P0 features fully demoable without fallback recordings.
- Grounded fixture answers verifiably correct at demo time.
- < 4 s to first audio on cached lines; < 8 s uncached.
- Judges can try it live on their own question in any of the three languages.
- Qualifies credibly for both the Gemini prize (multimodal + grounding + personalization) and the ElevenLabs prize (TTS + STT).

## 10. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Venue Wi-Fi fails during demo | No live API calls | Cache demo audio; phone hotspot backup; screen-recording fallback |
| ElevenLabs free-tier quota exhausted | No voice at demo | Aggressive caching; generate demo lines early and store them |
| Grounding returns stale/odd results | Wrong live answer | Rehearse grounding questions morning-of; keep a known-good question |
| Hallucinated match facts without grounding | Credibility hit | Route all time-sensitive queries through grounding; say so in pitch |
| Scope creep into F8/F9 | P0 unfinished | Hard cut line after F6; stretch features only after full demo rehearsal |
| Real-commentator voice cloning temptation | IP/likeness issue | Stock voices only; style lives in the script, not the voice |
| ElevenLabs promo email arrives late / missed | No paid-tier access | Register on mlh.io early; check spam; free tier + caching as fallback |
| Free-tier backend host cold starts during judging | Slow first demo request | Warm the deploy with a ping before judging; localhost fallback ready |

## 11. Timeline (typical 36-hour hackathon)

| Block | Work |
|---|---|
| **Hours 0–4** | Repo scaffold, FastAPI skeleton, React chat shell, keys wired via `local_config.py` |
| **Hours 4–10** | `/chat` with plain Gemini call → F1 personas → F2 languages working |
| **Hours 10–14** | F3 image upload + multimodal call |
| **Hours 14–18** | F4 grounding integration and query routing |
| **Hours 18–24** | Dev A: `/speak` + ElevenLabs TTS, voice styles, caching → F5, F6 · Dev B: quick deploy (Vercel + Render/Railway, env-var keys, QR code) |
| **Hours 24–28** | Polish UI, accessibility pass (F7), record fallback demo |
| **Hours 28–32** | Stretch: Scribe voice input (F8), hype generator (F9) — only if rehearsal passes |
| **Hours 32–36** | Demo rehearsal ×3, pitch deck, submission |

## 12. Resolved decisions

**Team size: 2.** Suggested split — Dev A owns the backend (FastAPI, `gemini_client.py`, `eleven_client.py`, grounding, caching); Dev B owns the frontend (React chat UI, pickers, mic/audio player) and the deploy. Both share demo rehearsal and pitch; Dev B drives the demo, Dev A narrates the architecture.

**Gemini model access (per the MLH Gemini partner page):** MLH hackers get their own API keys via Google AI Studio, with $300 in Google credits on a new account plus $10/month in free credits through Google Program Benefits — the full model family is available, not a restricted tier. Strategy: default to **Flash** for chat latency, and reserve **Pro** for the image-understanding (F3) and hype-script (F9) calls where reasoning depth shows. Students can also claim a free 1-year Gemini Pro plan.
- *Pre-hackathon action:* create the AI Studio account and claim credits before kickoff.

**ElevenLabs access (per the MLH ElevenLabs partner page):** registered MLH hackers receive a promo code by email during the week of the event, redeemable for a **free 3-month ElevenLabs subscription** — a paid tier, not the free tier, so the API (TTS and Scribe STT) is available with a real credit allowance. F8 (voice input) is therefore realistic; keep the caching strategy anyway for demo latency. ElevenLabs also offers conversational Agents, which could replace the hand-rolled transcribe→chat→speak loop if time allows — but the custom loop showcases Gemini better for the primary prize track.
- *Pre-hackathon action:* confirm CUhackathon registration on mlh.io/events and watch the inbox for the promo email; redeem immediately on arrival.

**Deploy target: quick deploy.** Frontend on Vercel; backend on a free-tier host (Render or Railway) with keys set as environment variables (never in the repo — `local_config.py` stays local-dev only). Deploy early (hour ~20, right after F5 works) so judges can scan a QR code and try it on their own phones — a strong differentiator versus localhost-only demos. Keep localhost as the on-stage fallback if venue Wi-Fi is poor.
