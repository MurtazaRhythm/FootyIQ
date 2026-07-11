"""Gemini integration: system-prompt builder (persona + language) and the
/chat completion call. Persona and language are prompt parameters — one
Gemini integration covers F1–F4 (see PRD, Key technical decisions)."""

import base64
import json

from google import genai
from google.genai import types

from config import GEMINI_CHAT_MODEL, GEMINI_VISION_MODEL, get_key

_client: genai.Client | None = None


def client() -> genai.Client:
    global _client
    if _client is None:
        key = get_key("GEMINI_API_KEY")
        if not key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set — copy local_config.example.py to "
                "local_config.py and add your key, or set the env var."
            )
        _client = genai.Client(api_key=key)
    return _client


LANGUAGE_NAMES = {"en": "English", "fr": "French", "es": "Spanish"}

# Each persona produces a structurally different answer, not just simpler or
# fancier wording of the same content (PRD F1 acceptance criteria).
PERSONA_INSTRUCTIONS = {
    "new-fan": (
        "The user has NEVER watched soccer. Lead with an everyday-life analogy "
        "that maps the concept to something universally familiar (queues, board "
        "games, cooking, traffic), then unpack it in plain language. Zero "
        "jargon — if a soccer term is unavoidable, define it in the same "
        "sentence. Keep it warm and short: 2–4 sentences."
    ),
    "casual": (
        "The user plays FIFA/EA FC and watches highlights. Answer as a short "
        "tactical note: name what happened, then why it matters for the "
        "game-plan. Soccer slang and FIFA references are fine. No deep stats. "
        "Keep it punchy: 2–5 sentences."
    ),
    "tactics-nerd": (
        "The user watches weekly and reads tactical analysis. Reference at "
        "least one measurable analytical concept relevant to the moment (xG, "
        "PPDA, defensive line height, pressing triggers, half-spaces, "
        "progressive passes...). Use scouting language, and briefly justify "
        "the number or concept you cite."
    ),
}

INTENSITY_RULE = (
    "Also classify the emotional intensity of the moment you are describing "
    "as one of: 'calm' (rules, tactics, neutral explanations), 'building' "
    "(rising tension — a chance forming, a close call, stakes increasing), or "
    "'explosive' (goals, red cards, dramatic VAR overturns, last-minute "
    "drama)."
)


def build_system_prompt(persona: str, language: str) -> str:
    return "\n\n".join(
        [
            "You are FootyIQ, a friendly personal soccer coach helping someone "
            "follow the 2026 FIFA World Cup (hosted by Canada, the USA, and "
            "Mexico). You explain rules, tactics, refereeing decisions, and "
            "tournament context.",
            PERSONA_INSTRUCTIONS[persona],
            f"Respond natively in {LANGUAGE_NAMES[language]} — do not "
            "translate from English; write directly in that language with "
            "natural, correct soccer terminology.",
            INTENSITY_RULE,
            "If the user references earlier context (their team, their "
            "level), carry it forward naturally.",
        ]
    )


RESPONSE_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "text": types.Schema(type=types.Type.STRING),
        "intensity": types.Schema(
            type=types.Type.STRING, enum=["calm", "building", "explosive"]
        ),
    },
    required=["text", "intensity"],
)


def _data_url_to_part(data_url: str) -> types.Part:
    """Convert a frontend data URL (data:image/png;base64,...) to a Part."""
    header, b64 = data_url.split(",", 1)
    mime = header.removeprefix("data:").split(";")[0] or "image/png"
    return types.Part.from_bytes(data=base64.b64decode(b64), mime_type=mime)


def generate_reply(
    message: str,
    persona: str,
    language: str,
    image: str | None,
    history: list[dict],
) -> dict:
    """Returns {"text": str, "intensity": str}. Raises on API failure —
    main.py maps that to an HTTP error the frontend already handles."""
    contents: list[types.Content] = [
        types.Content(
            role="user" if turn["role"] == "user" else "model",
            parts=[types.Part.from_text(text=turn["text"])],
        )
        for turn in history
        if turn["text"]
    ]

    parts: list[types.Part] = []
    if image:
        parts.append(_data_url_to_part(image))
    parts.append(types.Part.from_text(text=message or "Explain this image."))
    contents.append(types.Content(role="user", parts=parts))

    # Pro for image understanding where reasoning depth shows; Flash for chat
    # latency (PRD resolved decision).
    model = GEMINI_VISION_MODEL if image else GEMINI_CHAT_MODEL

    response = client().models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=build_system_prompt(persona, language),
            response_mime_type="application/json",
            response_schema=RESPONSE_SCHEMA,
        ),
    )
    return json.loads(response.text)
