/**
 * Bundled application fonts.
 *
 * These are npm-packaged local font files (@fontsource), NOT a remote
 * Google Fonts <link>. Vite copies the referenced .woff2/.woff files into
 * dist/assets at build time (content-hashed filenames) and every @font-face
 * `src: url(...)` below is rewritten to point at that same-origin bundled
 * asset — so the deployed app never makes a request to fonts.googleapis.com
 * or fonts.gstatic.com. This file's only job is to register those
 * @font-face rules before index.css's `--font-latin` / `--font-fa` tokens
 * reference the family names.
 *
 * - Inter (Latin + Latin-Extended, for German/English UI text): covers the
 *   umlauts/ß German needs via the latin-ext subset.
 * - Vazirmatn (Arabic block + Latin + Latin-Extended, for Persian/Arabic
 *   text): the combined weight file (not the `arabic-*` subset alone) is
 *   used deliberately, so a mixed Persian/German line rendered inside a
 *   `.fa` element still resolves its Latin characters to Vazirmatn instead
 *   of silently falling back to a system font mid-sentence.
 *
 * Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold) are the
 * minimum required set; 800 is included too since the UI's stat numbers and
 * a few headings use font-weight: 800.
 */

import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-ext-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-ext-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-ext-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-ext-700.css";
import "@fontsource/inter/latin-800.css";
import "@fontsource/inter/latin-ext-800.css";

import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import "@fontsource/vazirmatn/800.css";
