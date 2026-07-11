import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0A0B",
        surface: "#131316",
        border: "#232326",
        primary: "#FAFAFA",
        muted: "#8B8B93",
        accent: "#00E58C",
        calm: "#4B9BFF",
        building: "#FFC24B",
        explosive: "#00E58C",
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      fontSize: {
        xs: "12px",
        sm: "14px",
        base: "16px",
        lg: "20px",
        xl: "28px",
        "2xl": "40px",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
      },
    },
  },
  plugins: [],
} satisfies Config;
