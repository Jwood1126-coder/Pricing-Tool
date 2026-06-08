import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" makes asset paths relative so the built app loads correctly
// from a file:// URL inside the packaged Electron app.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { outDir: "dist", emptyOutDir: true },
  server: { port: 5173, strictPort: true },
  worker: { format: "es" },
});
