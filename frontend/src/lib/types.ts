export type Persona = "new-fan" | "casual" | "tactics-nerd";
export type Language = "en" | "fr" | "es";
export type Intensity = "calm" | "building" | "explosive";

export type PipelineState = "Thinking" | "Generating";

export interface Source {
  title: string;
  url: string;
}

// S6 tactical whiteboard: pitch is 100 wide (x) by 65 tall (y)
export interface DiagramPlayer {
  x: number;
  y: number;
  team: "attack" | "defense";
  label?: string;
}

export interface DiagramArrow {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  style?: "pass" | "run";
}

export interface Diagram {
  title: string;
  players: DiagramPlayer[];
  arrows?: DiagramArrow[];
}

export interface Message {
  id: string;
  role: "user" | "coach";
  text: string;
  image?: string; // data URL for user-attached images
  intensity?: Intensity;
  sources?: Source[]; // Google Search grounding citations
  autoSpeak?: boolean; // voice-initiated turns speak their reply
  persona?: Persona; // persona active when this message was sent
  diagram?: Diagram | null; // S6 tactical whiteboard
  timestamp: number;
}

export const PERSONAS: { id: Persona; label: string }[] = [
  { id: "new-fan", label: "Never watched" },
  { id: "casual", label: "Play FIFA" },
  { id: "tactics-nerd", label: "Tactics Nerd" },
];

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "fr", label: "FR" },
  { id: "es", label: "ES" },
];

// landing-page starter questions, shown in the user's selected language
// rendered 4 at a time and rotated with a crossfade on the landing page
export const SUGGESTED_PROMPTS: Record<Language, string[]> = {
  en: [
    "Why was that goal disallowed for offside?",
    "What does VAR actually check?",
    "Who plays in the next semifinal?",
    "Explain a 4-3-3 like I'm five",
    "Why do teams park the bus?",
    "What is a false nine?",
    "Who is favored to win the World Cup?",
    "Explain stoppage time simply",
  ],
  fr: [
    "Pourquoi ce but a-t-il été refusé pour hors-jeu ?",
    "Que vérifie la VAR exactement ?",
    "Qui joue la prochaine demi-finale ?",
    "Explique-moi le 4-3-3 simplement",
    "Pourquoi certaines équipes jouent si défensif ?",
    "C'est quoi un faux neuf ?",
    "Qui est favori pour gagner la Coupe du monde ?",
    "Explique le temps additionnel simplement",
  ],
  es: [
    "¿Por qué anularon ese gol por fuera de juego?",
    "¿Qué revisa el VAR exactamente?",
    "¿Quiénes juegan la próxima semifinal?",
    "Explícame el 4-3-3 de forma sencilla",
    "¿Por qué algunos equipos juegan tan defensivo?",
    "¿Qué es un falso nueve?",
    "¿Quién es favorito para ganar el Mundial?",
    "Explícame el tiempo añadido de forma simple",
  ],
};

// composer placeholder sentences, rotated with a fade
export const COMPOSER_PLACEHOLDERS: Record<Language, string[]> = {
  en: [
    "Ask anything about the match...",
    "Confused by a ref call? Ask away...",
    "What just happened on the pitch?",
    "Get any rule explained, no judgment...",
  ],
  fr: [
    "Pose ta question sur le match...",
    "Une décision arbitrale te dépasse ? Demande...",
    "Que vient-il de se passer sur le terrain ?",
    "Fais-toi expliquer n'importe quelle règle...",
  ],
  es: [
    "Pregunta lo que sea sobre el partido...",
    "¿No entiendes una decisión del árbitro? Pregunta...",
    "¿Qué acaba de pasar en la cancha?",
    "Pide que te expliquen cualquier regla...",
  ],
};

// shown in the composer while the mic is on
export const LISTENING_PHRASES: Record<Language, string[]> = {
  en: ["Listening now...", "Go ahead...", "Still listening..."],
  fr: ["J'écoute...", "Vas-y...", "Toujours là..."],
  es: ["Te escucho...", "Adelante...", "Sigo aquí..."],
};

export type Theme = "dark" | "light";

export type HypeMode = "preview" | "trash-talk";

// user-bubble label shown when hype is requested
export const HYPE_LABELS: Record<Language, Record<HypeMode, string>> = {
  en: {
    preview: "Hype me up about {team}!",
    "trash-talk": "Give me some trash talk for {team}!",
  },
  fr: {
    preview: "Chauffe-moi à bloc pour {team} !",
    "trash-talk": "Un petit chambrage pour {team} !",
  },
  es: {
    preview: "¡Dame hype de {team}!",
    "trash-talk": "¡Dame un pique para {team}!",
  },
};

export const HYPE_UI: Record<
  Language,
  { placeholder: string; preview: string; trashTalk: string; title: string }
> = {
  en: {
    title: "Hype generator",
    placeholder: "Team (e.g. Morocco)",
    preview: "Match preview",
    trashTalk: "Trash talk",
  },
  fr: {
    title: "Générateur de hype",
    placeholder: "Équipe (ex. Maroc)",
    preview: "Avant-match",
    trashTalk: "Chambrage",
  },
  es: {
    title: "Generador de hype",
    placeholder: "Equipo (ej. México)",
    preview: "Previa del partido",
    trashTalk: "Pique",
  },
};

export const INTENSITY_COLORS: Record<Intensity, string> = {
  calm: "#4B9BFF",
  building: "#FFC24B",
  explosive: "#6366F1",
};
