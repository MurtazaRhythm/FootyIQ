"""Gemini integration: system-prompt builder (persona + language) and the
/chat completion call. Persona and language are prompt parameters — one
Gemini integration covers F1–F4 (see PRD, Key technical decisions)."""

import base64
import re

from google import genai
from google.genai import types

from config import (
    GEMINI_CHAT_MODEL,
    GEMINI_HYPE_MODEL,
    GEMINI_VISION_MODEL,
    get_key,
)

_client: genai.Client | None = None  # reset on reload


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
        "The user is new to soccer. Explain clearly and warmly without being "
        "condescending — no forced analogies, no over-explaining basic facts. "
        "Define a jargon term only if it's genuinely unfamiliar (not 'goal' or "
        "'team'). Keep it conversational and concise: 2–4 sentences max."
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

GROUNDING_RULE = (
    "You have access to Google Search. ALWAYS search before stating any "
    "specific match result, score, scoreline, or 'who won' fact — even if "
    "you think you know the answer. Never fabricate or assume a result: if "
    "search returns no clear evidence for a specific result, say you could "
    "not find confirmed data rather than guessing. Use search for anything "
    "involving live tournament data: fixtures, results, standings, squads, "
    "injuries, or 'next opponent' reasoning. Timeless questions (rules, "
    "tactics) don't need search."
)

# Intensity rides on a tag line we parse off, not structured output:
# combining response_schema with the google_search tool makes the API drop
# grounding chunks inconsistently, and the sources are demo-critical (F4).
INTENSITY_TAG_RULE = (
    "Begin your reply with a line containing exactly "
    "'INTENSITY: calm', 'INTENSITY: building', or 'INTENSITY: explosive', "
    "then the answer on the following lines."
)


COACH_PERSONAS = {
    "new-fan":      ("El Pocho",        "warm, encouraging, patient — like Pochettino building belief"),
    "casual":       ("The Special One", "confident, charismatic, a bit theatrical — like Mourinho"),
    "tactics-nerd": ("El Maestro",      "precise, cerebral, analytical — like Guardiola"),
}


def build_system_prompt(persona: str, language: str) -> str:
    coach_name, coach_style = COACH_PERSONAS[persona]
    return "\n\n".join(
        [
            f"You are {coach_name}, a personal soccer coach helping someone "
            "follow the 2026 FIFA World Cup (hosted by Canada, the USA, and "
            f"Mexico). Your personality is {coach_style}. "
            f"Always refer to yourself as {coach_name}, never as FootyIQ.",
            PERSONA_INSTRUCTIONS[persona],
            f"Respond natively in {LANGUAGE_NAMES[language]} — do not "
            "translate from English; write directly in that language with "
            "natural, correct soccer terminology.",
            GROUNDING_RULE,
            INTENSITY_RULE,
            "If the user references earlier context (their team, their "
            "level), carry it forward naturally.",
            "Avoid em dashes (—). Use commas, conjunctions, or short "
            "sentences instead.",
            INTENSITY_TAG_RULE,
        ]
    )


def _data_url_to_part(data_url: str) -> types.Part:
    """Convert a frontend data URL (data:image/png;base64,...) to a Part."""
    header, b64 = data_url.split(",", 1)
    mime = header.removeprefix("data:").split(";")[0] or "image/png"
    return types.Part.from_bytes(data=base64.b64decode(b64), mime_type=mime)


def _extract_sources(response) -> list[dict]:
    """Pull deduplicated web sources out of the grounding metadata. Empty
    when the model answered without searching."""
    sources: list[dict] = []
    seen: set[str] = set()
    for candidate in response.candidates or []:
        gm = getattr(candidate, "grounding_metadata", None)
        for chunk in (gm.grounding_chunks if gm and gm.grounding_chunks else []):
            web = getattr(chunk, "web", None)
            if web and web.uri and web.uri not in seen:
                seen.add(web.uri)
                sources.append({"title": web.title or web.uri, "url": web.uri})
    return sources


INTENSITY_TAG_RE = re.compile(
    r"^\s*INTENSITY:\s*(calm|building|explosive)\s*\n?", re.IGNORECASE
)


def generate_reply(
    message: str,
    persona: str,
    language: str,
    image: str | None,
    history: list[dict],
) -> dict:
    """Returns {"text": str, "intensity": str, "sources": [{title, url}]}.
    Raises on API failure — main.py maps that to an HTTP error the frontend
    already handles."""
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

    # Search grounding is exposed on every call — Gemini decides autonomously
    # when a question needs live data (PRD F4: the model is the router).
    response = client().models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=build_system_prompt(persona, language),
            tools=[types.Tool(google_search=types.GoogleSearch())],
            max_output_tokens=400,
        ),
    )

    text = response.text or ""
    match = INTENSITY_TAG_RE.match(text)
    return {
        "text": INTENSITY_TAG_RE.sub("", text, count=1).strip(),
        "intensity": match.group(1).lower() if match else "calm",
        "sources": _extract_sources(response),
    }


HYPE_MODES = {
    "preview": (
        "Write a dramatic, stadium-announcer match/tournament preview for "
        "{team}. Build anticipation like the opening of a World Cup final "
        "broadcast."
    ),
    "trash-talk": (
        "Write a playful, group-chat-ready trash-talk message from a {team} "
        "fan to their friends. Cocky, funny, meme-adjacent — but good-natured "
        "and clean; no insults about nationality, race, or anything personal."
    ),
}


def generate_hype(team: str, mode: str, language: str) -> dict:
    """F9: one-tap hype content. Grounded in the team's real current
    tournament situation so the drama references actual results."""
    system = "\n\n".join(
        [
            "You are FootyIQ's hype engine: a dramatic soccer commentator and "
            "banter writer covering the 2026 FIFA World Cup.",
            HYPE_MODES[mode].format(team=team),
            "Use Google Search first to get the team's actual current "
            "tournament situation (latest result, next fixture, star "
            "players, whether they are still in it) and weave real facts "
            "into the drama. If they've been eliminated, lean into "
            "nostalgia or next-time bravado instead of pretending.",
            f"Write natively in {LANGUAGE_NAMES[language]}.",
            "Keep it under 120 words so it can be read aloud in about 40 "
            "seconds.",
            INTENSITY_RULE,
            INTENSITY_TAG_RULE,
        ]
    )
    response = client().models.generate_content(
        model=GEMINI_HYPE_MODEL,
        contents=f"Hype me up about {team}!",
        config=types.GenerateContentConfig(
            system_instruction=system,
            tools=[types.Tool(google_search=types.GoogleSearch())],
            max_output_tokens=250,
        ),
    )
    text = response.text or ""
    match = INTENSITY_TAG_RE.match(text)
    return {
        "text": INTENSITY_TAG_RE.sub("", text, count=1).strip(),
        "intensity": match.group(1).lower() if match else "explosive",
        "sources": _extract_sources(response),
    }
