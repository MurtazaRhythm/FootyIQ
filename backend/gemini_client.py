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
    lang = LANGUAGE_NAMES[language]
    return "\n\n".join(
        [
            f"LANGUAGE: You must respond exclusively in {lang}. This overrides "
            f"everything else. No matter what language previous messages are in, "
            f"your reply must always be in {lang}. Do not mix languages.",
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


HYPE_MODES = {
    "preview": (
        "You are the voice of a World Cup broadcast opener — think the cold "
        "open before kick-off when the camera sweeps the stadium and the "
        "crowd is electric. Write a match/tournament preview for {team} that "
        "feels like it belongs on prime-time TV: start with a vivid one-line "
        "hook (a moment, a stat, a storyline), build through the team's "
        "journey, name the star player who will carry them, and end on a "
        "single soaring sentence about what is at stake tonight. Punchy, "
        "cinematic, no filler. 3–4 short paragraphs maximum."
    ),
    "trash-talk": (
        "You are a {team} superfan firing up a group chat before the match. "
        "Write trash talk that is funny, cocky, and meme-worthy — the kind "
        "of message that gets 20 laughing-crying reactions. Reference a real "
        "recent result or rival moment to make it land harder. Use short "
        "punchy sentences, maybe a rhetorical question or two, and end with "
        "an unapologetic closer. Good-natured only — no insults about "
        "nationality, race, or anything personal. 60–90 words."
    ),
}


def generate_hype(team: str, mode: str, language: str) -> dict:
    """F9: one-tap hype content."""
    system = "\n\n".join(
        [
            f"LANGUAGE: You must respond exclusively in {LANGUAGE_NAMES[language]}. "
            f"This overrides everything else.",
            "You are FootyIQ's hype engine covering the 2026 FIFA World Cup "
            "(hosted by Canada, USA, and Mexico).",
            HYPE_MODES[mode].format(team=team),
            INTENSITY_RULE,
        ]
    )
    response = client().models.generate_content(
        model=GEMINI_CHAT_MODEL,
        contents=f"Generate hype content for {team} at the 2026 World Cup.",
        config=types.GenerateContentConfig(
            system_instruction=system,
            response_mime_type="application/json",
            response_schema=RESPONSE_SCHEMA,
        ),
    )
    return json.loads(response.text)
