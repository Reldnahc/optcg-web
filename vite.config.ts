import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/v1": "http://localhost:3000",
      "/openapi.json": "http://localhost:3000",
      "/docs": "http://localhost:3000",
      "/health": "http://localhost:3000",
    },
  },
});
