import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Two live deployments share this one build:
// - Cloudflare Pages (production): serves from the domain root, so base
//   must be "/". Cloudflare's build environment always sets CF_PAGES=1,
//   so this is detected automatically (no env var to configure by hand).
// - GitHub Pages (kept as a fallback): serves from
//   https://<user>.github.io/leben-in-deutschland-trainer/, a subpath, so
//   every asset URL must be prefixed with the repo name.
export default defineConfig({
  base: process.env.CF_PAGES ? "/" : "/leben-in-deutschland-trainer/",
  plugins: [react()],
  build: {
    outDir: "dist",
  },
});
