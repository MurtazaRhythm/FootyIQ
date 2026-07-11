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

export const INTENSITY_COLORS: Record<Intensity, string> = {
  calm: "#4B9BFF",
  building: "#FFC24B",
  explosive: "#00E58C",
};
