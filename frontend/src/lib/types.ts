export type Persona = "new-fan" | "casual" | "tactics-nerd";
export type Language = "en" | "fr" | "es";
export type Intensity = "calm" | "building" | "explosive";

export type PipelineState =
  | "thinking"
  | "checking live data"
  | "writing commentary"
  | "generating audio";

export interface Source {
  title: string;
  url: string;
}

export interface Message {
  id: string;
  role: "user" | "coach";
  text: string;
  image?: string; // data URL for user-attached images
  intensity?: Intensity;
  sources?: Source[]; // Google Search grounding citations
  autoSpeak?: boolean; // voice-initiated turns speak their reply (F8)
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
export const SUGGESTED_PROMPTS: Record<Language, string[]> = {
  en: [
    "Why was that goal disallowed for offside?",
    "What does VAR actually check?",
    "Who does Canada play next?",
    "Explain a 4-3-3 like I'm five",
  ],
  fr: [
    "Pourquoi ce but a-t-il été refusé pour hors-jeu ?",
    "Que vérifie la VAR exactement ?",
    "Qui affronte le Canada ensuite ?",
    "Explique-moi le 4-3-3 simplement",
  ],
  es: [
    "¿Por qué anularon ese gol por fuera de juego?",
    "¿Qué revisa el VAR exactamente?",
    "¿Contra quién juega Canadá después?",
    "Explícame el 4-3-3 de forma sencilla",
  ],
};

export type HypeMode = "preview" | "trash-talk";

// user-bubble label shown when hype is requested (F9)
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
  explosive: "#00E58C",
};
