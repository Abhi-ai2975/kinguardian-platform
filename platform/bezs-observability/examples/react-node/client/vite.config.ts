import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward /api requests to the Express server so the browser never
      // sees a cross-origin request (no CORS preflight for cookies, etc.).
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
