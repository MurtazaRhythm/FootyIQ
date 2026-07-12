"""Models, voices, and defaults. Keys live in local_config.py (gitignored)
or environment variables — never here."""

# Gemini: Flash for chat latency; Pro where reasoning depth shows — image
# understanding (F3) and hype scripts (F9). Pro needs the paid credits.
GEMINI_CHAT_MODEL = "gemini-3.1-flash-lite"
GEMINI_VISION_MODEL = "gemini-3.1-flash-lite"
GEMINI_HYPE_MODEL = "gemini-3.1-flash-lite"

# ElevenLabs stock voices only (no cloning of real commentators).
ELEVEN_MODEL = "eleven_flash_v2_5"
# S5: flash ignores the expressive `style` setting — dramatic multi-segment
# performances use the multilingual model where intensity actually lands
ELEVEN_DRAMA_MODEL = "eleven_multilingual_v2"
ELEVEN_STT_MODEL = "scribe_v1"

# S1: each coach persona speaks with a distinct stock voice.
ELEVEN_VOICES = {
    "new-fan": "bIHbv24MWmeRgasZH58o",  # Will — relaxed optimist (El Pocho)
    "casual": "IKne3meq5aSn9XLyUdCD",  # Charlie — deep, confident (The Special One)
    "tactics-nerd": "onwK4e9ZLuTAKqWW03F9",  # Daniel — steady broadcaster (El Maestro)
}
ELEVEN_DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb"  # George — narrator fallback

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
