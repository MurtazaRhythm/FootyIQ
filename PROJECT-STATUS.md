# FootyIQ — Project Status

**Last updated:** July 11, 2026
**Docs:** [PRD](PRD-worldcup-companion.md) · [How to run](HOW-TO-RUN.md) · [Frontend changes](FRONTEND-CHANGES.md) · [Backend changes](BACKEND-CHANGES.md)

## Feature completion

| Feature | Status | Verified by |
|---|---|---|
| **F1** Persona-based explanations | ✅ | Same offside question → analogy-led / tactical-note / stat-citing answers |
| **F2** Multilingual (EN/FR/ES) | ✅ | Native FR/ES conversations, correct terminology (*hors-jeu*, *fase de grupos*) |
| **F3** Explain this moment (image) | ✅ | Synthetic offside freeze-frame explained correctly at two levels; Pro model |
| **F4** Search grounding | ✅ | Live lookup + reasoning question grounded w/ cited sources; rules question doesn't search |
| **F5** Commentator voice (TTS) | ✅ | 3 intensity deliveries; 28ms cached / ~4s uncached; George stock voice |
| **F6** Multilingual audio | ✅ | French/Spanish text speaks natively (auto-detected) |
| **F7** Accessibility | ✅ | Larger-text toggle (16→20px), reduced-motion, aria-live replies, focus rings |
| **F8** Voice input (Scribe) | ✅ | Full hands-free loop in-browser: spoken question → spoken answer, no keyboard |
| **F9** Hype generator | ✅ | Grounded preview + trash-talk for a chosen team, EN/FR/ES, voiceable |
| **F10** In-session memory | ✅ | Team stated in msg 1 referenced in a relevant answer turns later |

## Architecture (as built)

```
React (Vite)  ──proxy──▶  FastAPI :8000  ──▶  Gemini (Flash chat / Pro vision+hype)
  chat · pickers · mic                │           └─ Google Search grounding tool
  audio player · hype ⚡              └──▶  ElevenLabs (TTS George / Scribe STT)
                                                └─ audio_cache/ (hashed MP3s)
```

Endpoints: `POST /chat` `{message, persona, language, image?, history}` → `{text, intensity, sources}` · `POST /speak` `{text, voice_style, language}` → MP3 · `POST /transcribe` (multipart audio) → `{text}` · `POST /hype` `{team, mode, language}` → `{text, intensity, sources}` · `GET /health`

## Running locally

```
backend:   cd backend && .venv\Scripts\uvicorn main:app --reload --port 8000
frontend:  cd frontend && npm run dev     → http://localhost:5173
```

First-time: `python -m venv .venv && .venv\Scripts\pip install -r requirements.txt`; copy `local_config.example.py` → `local_config.py` with both keys. Restart uvicorn after key changes (client is cached). Open the app via `localhost`, not `127.0.0.1` (Vite v8 binds `::1`).

Keys: Gemini key needs the Generative Language API allowed + billing/credits on the same project (Pro has no free-tier quota). ElevenLabs key needs the `speech_to_text` permission for the mic feature.

## Remaining work (operational, not features)

1. **Deploy** — Vercel (frontend) + Render/Railway (backend, keys as env vars). The PRD wants this early: QR-code demo for judges, warm-ping before judging. Biggest untested risk.
2. **Demo prep** — pre-cache rehearsed lines (play each once; cache makes replays instant), rehearse grounding questions morning-of, record the fallback screen-capture.
3. **Suggested-prompt refresh** — "Who does Canada play next?" chip now truthfully answers "eliminated" (grounding works!); consider a quarterfinal question for demo sparkle. One-line edits in `frontend/src/lib/types.ts`.
4. **Key rotation** — the Gemini key was pasted in chat once; regenerate before demo day for hygiene.

## Known trade-offs / gotchas

- **Hype latency**: Pro + grounding ≈ 90s worst case. `GEMINI_HYPE_MODEL = "gemini-flash-latest"` is the one-line fallback if it drags on stage.
- **Pipeline indicator is cosmetic** — fixed 1.8s steps, not real backend progress.
- **Intensity via tag line, not structured output** — deliberate: JSON mode drops grounding citations (see backend doc §5).
- **Per-line audible intensity shifts within one answer** (PRD F5 stretch wording) deferred — current: one intensity per message. The mapping exists; layering per-line stitching into `/speak` is the follow-up.
- **Hero title/tagline are English-only**; prompt chips and hype UI are localized.
- **Windows curl mangles accented JSON** — test FR/ES via the UI or Python, not raw curl.
