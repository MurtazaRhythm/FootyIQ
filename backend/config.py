"""Models, voices, and defaults. Keys live in local_config.py (gitignored)
or environment variables — never here."""

# Gemini: Flash for chat latency; Pro reserved for image understanding (F3)
# and hype scripts (F9) where reasoning depth shows.
GEMINI_CHAT_MODEL = "gemini-flash-latest"
GEMINI_VISION_MODEL = "gemini-pro-latest"

# ElevenLabs stock voices only (no cloning of real commentators).
ELEVEN_MODEL = "eleven_multilingual_v2"

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
