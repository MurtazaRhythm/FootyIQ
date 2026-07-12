# Deploying Pitchside (S2)

Frontend → **Vercel** · Backend → **Render** (free tier). API calls proxy through Vercel rewrites, so the app stays same-origin and CORS never enters the picture. Total time: ~20 minutes plus one cold-start wait.

## 0. Prerequisite

Push the repo (with `render.yaml` and `frontend/vercel.json`) to GitHub — both platforms deploy from the repo.

## 1. Backend on Render (~10 min)

1. Sign in at [render.com](https://render.com) with GitHub.
2. **New + → Blueprint** → select `MurtazaRhythm/FootyIQ` → Render reads [render.yaml](render.yaml) and shows `pitchside-backend`.
3. It will prompt for the two secret env vars: paste `GEMINI_API_KEY` and `ELEVENLABS_API_KEY` (same values as `backend/local_config.py`).
4. **Apply.** First build takes a few minutes.
5. Note the service URL. If it is exactly `https://pitchside-backend.onrender.com`, skip ahead. If Render appended a suffix (name collision), **edit [frontend/vercel.json](frontend/vercel.json)** and replace the host in all five rewrites, then commit and push.
6. Verify: open `https://<your-backend>.onrender.com/health` → `{"status":"ok"}`.

## 2. Frontend on Vercel (~5 min)

1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New → Project** → import `MurtazaRhythm/FootyIQ`.
3. **Root Directory: `frontend`** (critical — the app lives there). Framework preset: Vite (auto-detected). No env vars needed.
4. **Deploy.** The production URL (e.g. `https://footy-iq.vercel.app`) is the judge-facing link.
5. Verify: open the URL → landing page loads; open `/health` on the same domain → `{"status":"ok"}` proves the rewrite chain works.

## 3. Smoke test the deployed app (5 min)

On a **phone**, not just the laptop:
- Ask a rules question → answer + auto-speak.
- Ask "Who plays in the next semifinal?" → cited sources row.
- Mic: tap, speak, confirm the round trip (browser will ask mic permission — HTTPS on Vercel makes this work; it would not on a bare IP).
- Switch persona → different voice.

## 4. QR code

Any generator works, e.g. https://www.qrcode-monkey.com — point it at the Vercel production URL, download the PNG, drop it in the pitch deck and print one for the table.

## 5. Demo-day checklist (from PRD-standout-v2 §quick fixes)

- **Warm-ping before judging:** free Render instances sleep after ~15 min idle and take ~30–50 s to wake. Hit `/health` ~5 minutes before your slot (or keep a browser tab auto-refreshing it).
- **Pre-cache demo lines:** play each rehearsed answer once on the *deployed* app the morning of judging — the audio cache makes every replay instant. Note: the cache is wiped on each deploy, so do this **after** the final deploy.
- **Localhost fallback:** keep both dev servers ready per [HOW-TO-RUN.md](HOW-TO-RUN.md) in case venue Wi-Fi dies.

## Gotchas / notes

- **Keys live only in Render's dashboard** env vars — `local_config.py` stays local, `get_key()` in [backend/config.py](backend/config.py) already falls back to the environment.
- **Cold starts** also mean the first request after idle can time out on the frontend — if a judge's first question hangs, that's the wake-up; the second works. Warm-ping avoids this entirely.
- **Audio cache on Render is ephemeral** (free tier has no persistent disk) — fine for a demo; it just refills.
- Changing `render.yaml` or `vercel.json` requires a push; both platforms auto-redeploy on push to `main`.
