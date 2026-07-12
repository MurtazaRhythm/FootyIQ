# FootyIQ — Running Locally for Testing

A from-scratch guide to getting the app running on your machine and exercising every feature. Written for Windows (the dev environment); Mac/Linux differences are noted where they matter.

## 1. Prerequisites

| Tool | Version used | Check with |
|---|---|---|
| Python | 3.14 (3.11+ should work) | `python --version` |
| Node.js | 22.x | `node --version` |
| npm | comes with Node | `npm --version` |

You also need **two API keys** (both free to obtain):

1. **Gemini** — create at [Google AI Studio → API keys](https://aistudio.google.com/apikey).
   - The key's project must have the **Generative Language API** enabled (keys created *inside* AI Studio get this automatically).
   - The key's project must have **billing/credits attached** — Gemini Pro (used for images and hype) has *zero* free-tier quota. Check at [ai.studio/projects](https://ai.studio/projects) that the credits are on the **same project** as the key.
2. **ElevenLabs** — create at [elevenlabs.io → Settings → API Keys](https://elevenlabs.io/app/settings/api-keys).
   - The key needs **Text to Speech** *and* **Speech to Text** permissions (or "all permissions"). A TTS-only key breaks the mic feature with a 401.

## 2. One-time setup

From the repo root:

```powershell
# backend
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt        # Mac/Linux: .venv/bin/pip

# keys (this file is gitignored — never commit it)
copy local_config.example.py local_config.py          # Mac/Linux: cp
# then edit local_config.py and paste both keys:
#   GEMINI_API_KEY = "AIza..."
#   ELEVENLABS_API_KEY = "sk_..."

# frontend
cd ..\frontend
npm install
```

## 3. Start both servers

Two terminals:

```powershell
# terminal 1 — backend (MUST run from inside backend/, or the key import fails)
cd backend
.venv\Scripts\uvicorn main:app --reload --port 8000
```

```powershell
# terminal 2 — frontend
cd frontend
npm run dev
```

Open **http://localhost:5173** (use `localhost`, not `127.0.0.1` — the Vite dev server binds the IPv6 loopback).

Sanity checks if something looks off:
- Backend alive? → http://localhost:8000/health should return `{"status":"ok"}`
- If Vite prints "Port 5173 is in use, trying another one…", a stale dev server is running — kill it or just use the port Vite chose.
- Changed a key in `local_config.py`? **Restart uvicorn** — the client caches the key at first use (`--reload` only watches code files).

### Stopping the servers

**Ctrl+C** in each terminal. Windows wrinkles:
- Uvicorn with `--reload` may need a second Ctrl+C (reloader + worker).
- Vite can leave a child `node` process holding the port (next start then says "Port 5173 is in use"). Free the ports with:
  ```powershell
  Get-NetTCPConnection -LocalPort 5173,8000 -State Listen |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
  ```

## 4. Testing each feature

Work through these in order; together they cover the whole PRD.

1. **Landing page** — you should see the FootyIQ hero over green particles, persona/language pickers, and four suggested question chips.
2. **F1 personas** — ask "Why was that goal disallowed for offside?" three times, once per persona (switch via the header chips after the first message). The answers should differ in *structure*: analogy (Never watched) / tactical note with slang (Play FIFA) / cites a stat or concept (Tactics Nerd).
3. **F2 languages** — switch to FR or ES and ask anything. The reply should be natively written in that language (and the suggested chips + hype popover switch language too).
4. **F3 image** — attach any soccer screenshot with the 📷 button (offside freeze-frames work great) and ask "why is this offside?". Large images are auto-downscaled before upload.
5. **F4 grounding** — ask "Who plays in the next quarterfinal?" — the answer should be current and show a **sources** row with links. Then ask "What is a yellow card?" — no sources row (no search needed).
6. **F5/F6 audio** — tap ▶ on any reply. First play takes a few seconds (generating); replaying the same text is instant (disk cache in `backend/audio_cache/`). French/Spanish replies speak in that language.
7. **F7 accessibility** — the `aA` header button scales the whole UI up; toggling your OS "reduce motion" setting removes the particle background.
8. **F8 voice** — tap the 🎤, allow mic access, ask a question out loud, tap the red square to stop. Your words appear as a message and the answer **speaks itself** when it arrives.
9. **F9 hype** — tap ⚡, type a team (e.g. `Morocco`), pick "Match preview" or "Trash talk". Grounded hype lands in the chat; tap ▶ to have George read it. *Note: this uses Gemini Pro + search and can take 60–90s.*
10. **F10 memory** — say "I'm supporting Morocco!" then a few turns later ask "do we have a good chance?" — the answer should reference Morocco unprompted.
11. **Home navigation** — click the FootyIQ logo during a chat → confirmation dialog → "Go home" clears the session back to the landing page.

## 5. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "I couldn't reach the coaching desk" in chat | Backend not running, or it crashed — check terminal 1. The real error is always in the uvicorn log (clients only get a generic 502). |
| 502 + log shows `API_KEY_SERVICE_BLOCKED` | Gemini key's project doesn't allow the Generative Language API — recreate the key inside AI Studio. |
| 502 + log shows `RESOURCE_EXHAUSTED` / "prepayment credits depleted" | Billing/credits are on a different Google project than the key. |
| Audio button shows "audio unavailable" | Check the ElevenLabs key and its permissions in the uvicorn log. |
| Mic transcribes nothing / 401 in log | ElevenLabs key is missing the `speech_to_text` permission. |
| Every request feels ~2s slower than it should | You're proxying via `localhost` somewhere — the config already uses `127.0.0.1` for the backend hop; keep it that way. |
| Accented characters look garbled when testing with curl | Windows shell encoding, not a bug — test FR/ES through the UI or a Python script. |
| Blank page at 127.0.0.1:5173 | Use `http://localhost:5173` — Vite binds the IPv6 loopback. |

## 6. Useful facts for testers

- **Sessions are memory-only.** Refreshing the page or clicking "Go home" wipes the conversation — by design (PRD: no accounts/persistence).
- **Costs**: every chat message is a Gemini call; every *first* audio play is ElevenLabs characters (replays are cached). Don't loop-test `/speak` with unique strings.
- **Fast demo lines**: play your rehearsal lines once beforehand — the cache makes them instant on stage.
- API can be tested without the UI: see endpoint shapes in [PROJECT-STATUS.md](PROJECT-STATUS.md); e.g. `POST http://localhost:8000/chat` with `{"message":"...", "persona":"casual", "language":"en", "history":[]}`.
