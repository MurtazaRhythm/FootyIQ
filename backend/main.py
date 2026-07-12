"""FastAPI routes for FootyIQ. Run locally with:

    uvicorn main:app --reload --port 8000

The Vite dev server proxies /chat, /speak, and /transcribe here."""

import logging
from typing import Literal, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

import eleven_client
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


class Source(BaseModel):
    title: str
    url: str


class DiagramPlayer(BaseModel):
    x: float
    y: float
    team: Literal["attack", "defense"]
    label: str = ""


class DiagramArrow(BaseModel):
    fromX: float
    fromY: float
    toX: float
    toY: float
    style: Literal["pass", "run"] = "run"


class Diagram(BaseModel):
    title: str
    players: list[DiagramPlayer]
    arrows: list[DiagramArrow] = []


class ChatResponse(BaseModel):
    text: str
    intensity: Literal["calm", "building", "explosive"] = "calm"
    # web sources from Google Search grounding; empty for ungrounded answers
    sources: list[Source] = []
    # S6: tactical whiteboard, present only for diagram-worthy questions
    diagram: Optional[Diagram] = None
    # S7: the user's stated team allegiance, e.g. "Morocco 🇲🇦"
    team: Optional[str] = None


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
    return ChatResponse(
        text=reply["text"],
        intensity=reply["intensity"],
        sources=reply.get("sources", []),
        diagram=reply.get("diagram"),
        team=reply.get("team"),
    )


class SpeakRequest(BaseModel):
    text: str
    voice_style: Literal["calm", "building", "explosive"] = "calm"
    language: Literal[*LANGUAGES] = "en"  # accepted for future use; the
    # multilingual model detects the language from the text itself
    # S1: selects the coach's voice; None falls back to the narrator
    persona: Optional[Literal[*PERSONAS]] = None


@app.post("/speak")
def speak(req: SpeakRequest) -> Response:
    try:
        audio = eleven_client.tts(req.text, req.voice_style, req.persona)
    except Exception:
        logger.exception("ElevenLabs call failed")
        raise HTTPException(status_code=502, detail="TTS call failed")
    return Response(content=audio, media_type="audio/mpeg")


class TranscribeResponse(BaseModel):
    text: str


class HypeRequest(BaseModel):
    team: str
    mode: Literal["preview", "trash-talk"]
    language: Literal[*LANGUAGES] = "en"


@app.post("/hype")
def hype(req: HypeRequest) -> ChatResponse:
    try:
        reply = gemini_client.generate_hype(req.team, req.mode, req.language)
    except Exception:
        logger.exception("Hype generation failed")
        raise HTTPException(status_code=502, detail="Hype generation failed")
    return ChatResponse(
        text=reply["text"],
        intensity=reply["intensity"],
        sources=reply.get("sources", []),
    )


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)) -> TranscribeResponse:
    try:
        text = eleven_client.stt(
            await audio.read(), audio.content_type or "audio/webm"
        )
    except Exception:
        logger.exception("Scribe call failed")
        raise HTTPException(status_code=502, detail="STT call failed")
    return TranscribeResponse(text=text)
