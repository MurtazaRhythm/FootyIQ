"""Gemini integration: system-prompt builder (persona + language) and the
/chat completion call. Persona and language are prompt parameters — one
Gemini integration covers F1–F4 (see PRD, Key technical decisions)."""

import base64
import json
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

# S7: surface the invisible F10 session memory — the model reports the
# user's stated allegiance so the UI can show it as a chip.
TEAM_TAG_RULE = (
    "On the line right after the DIAGRAM line, write exactly "
    "'TEAM: <team name> <flag emoji>' if the user has explicitly stated "
    "which team THEY support (in this message or earlier in the "
    "conversation, e.g. 'I'm supporting Morocco', 'my team is France'), "
    "or 'TEAM: none' otherwise. Asking about a team is not supporting it. "
    "If they switch allegiance, report the newest one."
)

# S6: the main call only *tags* diagram-worthiness; a separate structured
# call draws it, so the whiteboard can never break the chat path.
DIAGRAM_TAG_RULE = (
    "On the line right after the INTENSITY line, write exactly "
    "'DIAGRAM: yes' or 'DIAGRAM: no'. Use 'yes' only when the question is "
    "about a formation, tactical shape, pressing structure, or a specific "
    "on-pitch situation that a 2D top-down pitch diagram would genuinely "
    "clarify (e.g. 'explain a 4-3-3', 'what is a high line', 'what is a "
    "false nine'). Use 'no' for rules trivia, results, schedules, players, "
    "and general questions."
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
            DIAGRAM_TAG_RULE,
            TEAM_TAG_RULE,
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
DIAGRAM_TAG_RE = re.compile(r"^\s*DIAGRAM:\s*(yes|no)\s*\n?", re.IGNORECASE)
TEAM_TAG_RE = re.compile(r"^\s*TEAM:\s*(.+?)\s*(?:\n|$)", re.IGNORECASE)

# Pitch coordinates: x 0-100 (attacking left -> right), y 0-65 (top -> bottom)
DIAGRAM_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "title": types.Schema(type=types.Type.STRING),
        "players": types.Schema(
            type=types.Type.ARRAY,
            items=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "x": types.Schema(type=types.Type.NUMBER),
                    "y": types.Schema(type=types.Type.NUMBER),
                    "team": types.Schema(
                        type=types.Type.STRING, enum=["attack", "defense"]
                    ),
                    "label": types.Schema(type=types.Type.STRING),
                },
                required=["x", "y", "team"],
            ),
        ),
        "arrows": types.Schema(
            type=types.Type.ARRAY,
            items=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "fromX": types.Schema(type=types.Type.NUMBER),
                    "fromY": types.Schema(type=types.Type.NUMBER),
                    "toX": types.Schema(type=types.Type.NUMBER),
                    "toY": types.Schema(type=types.Type.NUMBER),
                    "style": types.Schema(
                        type=types.Type.STRING, enum=["pass", "run"]
                    ),
                },
                required=["fromX", "fromY", "toX", "toY"],
            ),
        ),
    },
    required=["title", "players"],
)


def generate_diagram(question: str, answer: str) -> dict | None:
    """S6: second, structured-output-only call (no search tool, so JSON mode
    is safe here). Returns a diagram dict or None — never raises, because a
    failed drawing must not break the chat reply it accompanies."""
    try:
        response = client().models.generate_content(
            model=GEMINI_CHAT_MODEL,
            contents=(
                f"Question: {question}\n\nCoach's answer: {answer}\n\n"
                "Draw the tactical diagram that best illustrates this answer."
            ),
            config=types.GenerateContentConfig(
                system_instruction=(
                    "You generate top-down soccer pitch diagrams. The pitch "
                    "is 100 wide (x, the featured team attacks left to "
                    "right) and 65 tall (y). Place at most 11 'attack' "
                    "players (the featured shape/formation) and only the "
                    "'defense' players that matter for the concept (often "
                    "none). Use short position labels (GK, LB, CB, CM, ST, "
                    "LW...). Add at most 5 arrows: 'run' for player "
                    "movement, 'pass' for ball movement. Keep it minimal "
                    "and legible."
                ),
                response_mime_type="application/json",
                response_schema=DIAGRAM_SCHEMA,
            ),
        )
        diagram = json.loads(response.text)
        # clamp to the pitch and sane counts so the client renders safely
        diagram["players"] = [
            {
                "x": min(100, max(0, p["x"])),
                "y": min(65, max(0, p["y"])),
                "team": p["team"],
                "label": (p.get("label") or "")[:3],
            }
            for p in diagram.get("players", [])[:22]
        ]
        diagram["arrows"] = [
            {
                "fromX": min(100, max(0, a["fromX"])),
                "fromY": min(65, max(0, a["fromY"])),
                "toX": min(100, max(0, a["toX"])),
                "toY": min(65, max(0, a["toY"])),
                "style": a.get("style") or "run",
            }
            for a in diagram.get("arrows", [])[:8]
        ]
        return diagram if diagram["players"] else None
    except Exception:
        return None


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
    text = INTENSITY_TAG_RE.sub("", text, count=1)
    diagram_match = DIAGRAM_TAG_RE.match(text)
    text = DIAGRAM_TAG_RE.sub("", text, count=1)
    team_match = TEAM_TAG_RE.match(text)
    text = TEAM_TAG_RE.sub("", text, count=1).strip()

    # S7: the user's stated allegiance, or None if they haven't declared one
    team = team_match.group(1).strip() if team_match else None
    if team and team.lower() in ("none", "aucune", "ninguno", "ninguna"):
        team = None

    # S6: only tactics-shaped questions get the second, diagram-drawing call
    diagram = None
    if diagram_match and diagram_match.group(1).lower() == "yes":
        diagram = generate_diagram(message, text)

    return {
        "text": text,
        "intensity": match.group(1).lower() if match else "calm",
        "sources": _extract_sources(response),
        "diagram": diagram,
        "team": team,
    }


def generate_ticker(language: str) -> str:
    """T4: one broadcast ticker line for the landing page, grounded in the
    real fixture list. Cached by the caller — this is never on a hot path."""
    response = client().models.generate_content(
        model=GEMINI_CHAT_MODEL,
        contents=(
            "What is the single most important in-progress or upcoming "
            "fixture at the 2026 FIFA World Cup right now?"
        ),
        config=types.GenerateContentConfig(
            system_instruction=(
                "You write one broadcast-style ticker line about the 2026 "
                "FIFA World Cup. Use Google Search to find the current or "
                "next marquee fixture and pick EXACTLY ONE match — never "
                "summarize several. Name both teams, the stage, and the "
                "city if known. Reply with EXACTLY one line, uppercase, at "
                "most 10 words, segments separated by ' · ', like: "
                "'TONIGHT · FRANCE v SPAIN · SEMIFINAL · DALLAS'. "
                f"Write it in {LANGUAGE_NAMES[language]}. No quotes, no "
                "explanations, no emoji."
            ),
            tools=[types.Tool(google_search=types.GoogleSearch())],
            max_output_tokens=1000,
        ),
    )
    line = (response.text or "").strip().strip('"').splitlines()[0].strip()
    if not line:
        raise RuntimeError("empty ticker line")
    return line


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


# S5: every hype line carries its own intensity so TTS can shift delivery
# mid-performance (the original F5 vision)
SEGMENT_LINE_RE = re.compile(
    r"^\s*\[(calm|building|explosive)\]\s*(.+?)\s*$", re.IGNORECASE
)


def generate_hype(team: str, mode: str, language: str) -> dict:
    """F9/S5: one-tap hype content, written as an intensity-tagged script.
    Grounded in the team's real current tournament situation."""
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
            "Write 4 to 6 short lines, each on its own line, each starting "
            "with exactly one tag: [calm], [building], or [explosive]. "
            "Structure the drama like a broadcast: open measured, raise the "
            "stakes line by line, and finish at full throat. Use at least "
            "two different tags. Under 120 words total.",
        ]
    )
    response = client().models.generate_content(
        model=GEMINI_HYPE_MODEL,
        contents=f"Hype me up about {team}!",
        config=types.GenerateContentConfig(
            system_instruction=system,
            tools=[types.Tool(google_search=types.GoogleSearch())],
            max_output_tokens=300,
        ),
    )
    raw = response.text or ""
    segments = [
        {"intensity": m.group(1).lower(), "text": m.group(2)}
        for line in raw.splitlines()
        if (m := SEGMENT_LINE_RE.match(line))
    ]
    if segments:
        text = "\n".join(s["text"] for s in segments)
        # bubble color reflects the peak of the performance
        peak = max(
            (s["intensity"] for s in segments),
            key=["calm", "building", "explosive"].index,
        )
    else:
        # model ignored the tag format — degrade gracefully to single-voice
        text = INTENSITY_TAG_RE.sub("", raw, count=1).strip()
        peak = "explosive"
    return {
        "text": text,
        "intensity": peak,
        "sources": _extract_sources(response),
        "segments": segments,
    }
