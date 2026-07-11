"""FastAPI routes for FootyIQ. Run locally with:

    uvicorn main:app --reload --port 8000

The Vite dev server proxies /chat, /speak, and /transcribe here."""

import logging
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import gemini_client
from config import LANGUAGES, PERSONAS

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="FootyIQ backend")

# The Vite proxy makes requests same-origin in dev, but CORS is left open so
# a deployed frontend (Vercel) can talk to a deployed backend (Render/Railway)
# without same-origin plumbing. No credentials are used.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class HistoryTurn(BaseModel):
    role: Literal["user", "coach"]
    text: str


class ChatRequest(BaseModel):
    message: str
    persona: Literal[*PERSONAS]
    language: Literal[*LANGUAGES]
    image: Optional[str] = None  # data URL from the frontend
    history: list[HistoryTurn] = []


class ChatResponse(BaseModel):
    text: str
    intensity: Literal["calm", "building", "explosive"] = "calm"


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/chat")
def chat(req: ChatRequest) -> ChatResponse:
    try:
        reply = gemini_client.generate_reply(
            message=req.message,
            persona=req.persona,
            language=req.language,
            image=req.image,
            history=[t.model_dump() for t in req.history],
        )
    except Exception:
        # the frontend shows its own fallback message on any non-2xx
        logger.exception("Gemini call failed")
        raise HTTPException(status_code=502, detail="Gemini call failed")
    return ChatResponse(text=reply["text"], intensity=reply["intensity"])
