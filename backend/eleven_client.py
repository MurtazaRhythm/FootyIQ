"""ElevenLabs TTS wrapper with a disk cache. MP3s are keyed by
hash(text, voice, model, settings) so rehearsed demo lines play instantly
and repeats don't burn the character quota (PRD, Key technical decisions)."""

import hashlib
import json
import time
from pathlib import Path

import httpx

from config import (
    ELEVEN_MODEL,
    ELEVEN_STT_MODEL,
    ELEVEN_VOICE_ID,
    ELEVEN_VOICE_SETTINGS,
    get_key,
)

CACHE_DIR = Path(__file__).parent / "audio_cache"

TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"


def _api_key() -> str:
    key = get_key("ELEVENLABS_API_KEY")
    if not key:
        raise RuntimeError(
            "ELEVENLABS_API_KEY is not set — add it to local_config.py or "
            "set the env var."
        )
    return key


def _cache_path(text: str, intensity: str) -> Path:
    key = json.dumps(
        [text, ELEVEN_VOICE_ID, ELEVEN_MODEL, ELEVEN_VOICE_SETTINGS[intensity]],
        ensure_ascii=False,
    )
    return CACHE_DIR / f"{hashlib.sha256(key.encode()).hexdigest()}.mp3"


def tts(text: str, intensity: str) -> bytes:
    """Returns MP3 bytes. The multilingual model auto-detects the language
    from the text itself, so FR/ES answers speak natively (F6) without a
    language parameter. Raises on API failure."""
    path = _cache_path(text, intensity)
    if path.exists():
        return path.read_bytes()

    # one retry: a transient ElevenLabs 429/5xx shouldn't kill a demo playback
    for attempt in range(2):
        response = httpx.post(
            TTS_URL.format(voice_id=ELEVEN_VOICE_ID),
            headers={"xi-api-key": _api_key()},
            json={
                "text": text,
                "model_id": ELEVEN_MODEL,
                "voice_settings": ELEVEN_VOICE_SETTINGS[intensity],
            },
            timeout=60,
        )
        if response.status_code < 500 and response.status_code != 429:
            break
        if attempt == 0:
            time.sleep(1)
    if response.status_code >= 400:
        # surface the body: ElevenLabs puts the real reason there (e.g.
        # quota_exceeded arrives as a 401, not a 429)
        raise RuntimeError(
            f"ElevenLabs TTS {response.status_code}: {response.text[:300]}"
        )

    CACHE_DIR.mkdir(exist_ok=True)
    path.write_bytes(response.content)
    return response.content


def stt(audio: bytes, mime_type: str) -> str:
    """Transcribe a voice question with Scribe (F8). Returns the transcript
    text; Scribe auto-detects the spoken language. Raises on API failure."""
    response = httpx.post(
        STT_URL,
        headers={"xi-api-key": _api_key()},
        data={"model_id": ELEVEN_STT_MODEL},
        files={"file": ("question", audio, mime_type)},
        timeout=120,
    )
    if response.status_code >= 400:
        raise RuntimeError(
            f"ElevenLabs STT {response.status_code}: {response.text[:300]}"
        )
    return response.json().get("text", "").strip()
