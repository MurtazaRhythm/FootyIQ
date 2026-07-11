import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // FastAPI backend during development
      "/chat": "http://localhost:8000",
      "/speak": "http://localhost:8000",
      "/transcribe": "http://localhost:8000",
    },
  },
});
