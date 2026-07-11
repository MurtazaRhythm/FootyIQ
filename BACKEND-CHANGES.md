# Backend Changes — FastAPI Scaffold & Gemini Integration

**Date:** July 11, 2026
**Scope:** Step 1 (backend scaffold + stub `/chat`) and Step 2 (real Gemini calls with persona/language prompts)
**Related docs:** [PRD-worldcup-companion.md](PRD-worldcup-companion.md) · [FRONTEND-CHANGES.md](FRONTEND-CHANGES.md)

---

## 1. Step 1 — Backend scaffold + stub `/chat`

The goal was the smallest useful increment: make the already-wired frontend get a real reply instead of its "couldn't reach the coaching desk" fallback, before any AI was involved.

### What was added

| File | Purpose |
|---|---|
| [backend/main.py](backend/main.py) | FastAPI app: `POST /chat` and `GET /health`. Pydantic models validate `persona`, `language`, and `history` shape — invalid values get a 422. CORS left open so a deployed frontend (Vercel) can reach a deployed backend (Render/Railway). |
| [backend/config.py](backend/config.py) | Model names and defaults: Flash for chat latency, Pro for image understanding (PRD resolved decision). Includes `get_key()` which reads keys from `local_config.py` locally or environment variables when deployed. |
| [backend/local_config.example.py](backend/local_config.example.py) | Committed template. Copy to `local_config.py` and fill in keys. |
| [backend/.gitignore](backend/.gitignore) | Created **before** any key file existed. Ignores `local_config.py`, `.venv/`, `__pycache__/`, and the future `audio_cache/`. |
| [backend/requirements.txt](backend/requirements.txt) | `fastapi`, `uvicorn[standard]`, `google-genai`. |

- Python 3.14 venv at `backend/.venv`.
- No frontend changes were needed — the Vite proxy (`/chat`, `/speak`, `/transcribe` → `localhost:8000`) already existed in [frontend/vite.config.ts](frontend/vite.config.ts).
- The Step 1 stub echoed message/persona/language/image-presence in all three languages to prove the full payload plumbing; it was removed in Step 2.

### API keys

- The Gemini API key lives in `backend/local_config.py` — **gitignored, verified with `git check-ignore`**, never committed.
- Key validated against the Gemini API (models-list returned 200).
- The `ELEVENLABS_API_KEY` slot is empty until the MLH promo code arrives.
- ⚠️ The Gemini key was shared in a chat session — cheap to rotate in Google AI Studio before the demo; only `local_config.py` needs updating.

## 2. Step 2 — Real Gemini integration (F1, F2, F10 + intensity)

### What was added

| File | Change |
|---|---|
| [backend/gemini_client.py](backend/gemini_client.py) | **New.** System-prompt builder (persona + language are prompt parameters — the PRD's "personalization engine" decision), conversation-history mapping, data-URL → image-part conversion, and the `generate_content` call with structured output. |
| [backend/main.py](backend/main.py) | Stub replaced with the real call. Gemini failures are logged server-side and mapped to a 502, which the frontend's existing fallback message already handles. |

### Design decisions (confirmed)

- **Complete responses, not streaming.** The frontend expects a single JSON `{text, intensity}`; Flash is fast enough, and the pipeline indicator covers perceived latency. Streaming can be revisited later.
- **Intensity tagged now, not at F5.** Every answer is classified `calm` / `building` / `explosive` by Gemini in the same call, enforced by a structured-output schema (`response_schema` with an enum — no fragile JSON parsing). The UI already colors bubbles by intensity, and the F5 ElevenLabs voice-style mapping gets this for free.
- **google-genai SDK** (v2.11) over raw REST — handles auth, image parts, history, structured output, and later the Search-grounding tool with minimal code.
- **Model routing:** text-only chat → Flash (`gemini-flash-latest`); requests with an image → Pro (`gemini-pro-latest`). The image path (F3) is written but not yet tested with a real screenshot.
- **Persona prompts demand structural divergence** per F1's acceptance criteria: new-fan answers must be analogy-led, casual answers are short tactical notes with slang/FIFA references allowed, tactics-nerd answers must cite a measurable analytical concept.

### Verified against PRD acceptance criteria

| Criterion | Result |
|---|---|
| **F1** — same question, 3 structurally different answers | ✅ Offside question → grocery-queue analogy / EA FC "run trigger" tactical note / defensive-line-height + SAOT citation |
| **F2** — native FR/ES with correct terminology | ✅ *hors-jeu*, *fase de grupos*; answers written natively, not translated |
| **F10** — session memory via `history` | ✅ "I'm supporting Morocco" (msg 1) reflected in a later "do we have a chance?" answer |
| Intensity varies by content | ✅ Both `calm` and `building` observed |
| End-to-end in the real UI | ✅ Browser-driven test: French analogy answer rendered in a chat bubble |

## 3. Running locally

```
backend:   cd backend && .venv\Scripts\uvicorn main:app --reload --port 8000
frontend:  cd frontend && npm run dev        # http://localhost:5173
health:    GET http://localhost:8000/health
```

First-time setup: `python -m venv .venv && .venv\Scripts\pip install -r requirements.txt`, then copy `local_config.example.py` → `local_config.py` and add keys.

## 4. Things to note / open items

- **Ungrounded answers invent stats.** The tactics-nerd persona confidently fabricated specifics ("53 meters", "14 centimeters", SAOT readings) about a hypothetical moment. Acceptable for rule explanations, but this is exactly why **F4 Search grounding is the next priority** before anyone asks about real fixtures/results.
- **F3 (image) path is written but untested** — next step is exercising it with a real offside freeze-frame screenshot.
- **A curl/PowerShell encoding gotcha, not a bug:** accented characters sent via `curl -d` from the Windows shell got mangled; the API and backend handle UTF-8 correctly (verified via Python and the browser). Test non-English flows through the UI or Python, not raw curl.
- **Latency is noticeable on structured-output calls** (a few seconds). Fine with the pipeline indicator; if it grows, options are trimming the system prompt or revisiting streaming.
- **Error detail is generic by design** — clients get a plain 502; the real traceback goes to the uvicorn log. Check the backend console when debugging.
- **`local_config.py` import pattern** means the backend must run with `backend/` as the working directory (uvicorn from inside `backend/`). The deploy will use env vars via `get_key()` instead.
