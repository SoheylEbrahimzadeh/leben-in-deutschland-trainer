import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://<user>.github.io/leben-in-deutschland-trainer/ via GitHub Pages,
// so all asset URLs must be prefixed with the repo name.
export default defineConfig({
  base: "/leben-in-deutschland-trainer/",
  plugins: [react()],
  build: {
    outDir: "dist",
  },
});
