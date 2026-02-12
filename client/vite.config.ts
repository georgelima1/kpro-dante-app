import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // REST
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true
      },
      // WebSocket
      "/ws": {
        target: "ws://localhost:8787",
        ws: true
      }
    }
  }
});
