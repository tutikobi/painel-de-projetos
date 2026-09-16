import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// O proxy deixa o SPA e a API na mesma origem em desenvolvimento,
// então não é preciso CORS nem dependência extra no backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
