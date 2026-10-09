import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Yjs breaks if two copies of it are bundled, so force a single copy.
  resolve: { dedupe: ["yjs", "y-protocols", "y-prosemirror", "@tiptap/pm"] },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
      "/socket.io": { target: "http://localhost:4000", ws: true },
    },
  },
});
