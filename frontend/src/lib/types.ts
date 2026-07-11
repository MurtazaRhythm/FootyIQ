export type Persona = "new-fan" | "casual" | "tactics-nerd";
export type Language = "en" | "fr" | "es";
export type Intensity = "calm" | "building" | "explosive";

export type PipelineState =
  | "thinking"
  | "checking live data"
  | "writing commentary"
  | "generating audio";

export interface Message {
  id: string;
  role: "user" | "coach";
  text: string;
  image?: string; // data URL for user-attached images
  intensity?: Intensity;
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

export const INTENSITY_COLORS: Record<Intensity, string> = {
  calm: "#4B9BFF",
  building: "#FFC24B",
  explosive: "#00E58C",
};
