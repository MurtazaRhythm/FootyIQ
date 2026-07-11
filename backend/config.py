"""Models, voices, and defaults. Keys live in local_config.py (gitignored)
or environment variables — never here."""

# Gemini: Flash for chat latency; Pro where reasoning depth shows — image
# understanding (F3) and hype scripts (F9). Pro needs the paid credits.
GEMINI_CHAT_MODEL = "gemini-flash-latest"
GEMINI_VISION_MODEL = "gemini-pro-latest"
GEMINI_HYPE_MODEL = "gemini-pro-latest"

# ElevenLabs stock voices only (no cloning of real commentators).
# George — deep British narrator; swap the ID to change the commentator.
ELEVEN_MODEL = "eleven_multilingual_v2"
ELEVEN_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"
ELEVEN_STT_MODEL = "scribe_v1"

# Intensity → delivery. Lower stability + higher style = more dramatic,
# less predictable read; a goal-mouth scramble should not sound like a
# tactics lecture (PRD F5).
ELEVEN_VOICE_SETTINGS = {
    "calm": {"stability": 0.75, "similarity_boost": 0.75, "style": 0.15},
    "building": {"stability": 0.45, "similarity_boost": 0.75, "style": 0.55},
    "explosive": {"stability": 0.25, "similarity_boost": 0.70, "style": 0.95},
}

def get_key(name: str) -> str:
    """Read an API key from local_config.py (local dev) or the environment
    (deployed hosts). Returns "" if unset so callers can fail with a clear
    message instead of an ImportError."""
    import os

    try:
        import local_config

        value = getattr(local_config, name, "")
        if value:
            return value
    except ImportError:
        pass
    return os.getenv(name, "")


PERSONAS = ("new-fan", "casual", "tactics-nerd")
LANGUAGES = ("en", "fr", "es")
INTENSITIES = ("calm", "building", "explosive")
