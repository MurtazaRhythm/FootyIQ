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
      // FastAPI backend during development. 127.0.0.1, not localhost: on
      // Windows, localhost resolves IPv6-first and costs ~2s per request
      // when the backend only listens on IPv4.
      "/chat": "http://127.0.0.1:8000",
      "/speak": "http://127.0.0.1:8000",
      "/transcribe": "http://127.0.0.1:8000",
      "/hype": "http://127.0.0.1:8000",
      "/ticker": "http://127.0.0.1:8000",
    },
  },
});
