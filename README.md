# leben-in-deutschland-trainer

Leben-in-Deutschland / Einbürgerungstest prep trainer (Hessen), built for Armin.

## Status

Data phase: COMPLETE. Learning engine, mock exam, dashboard, mobile app UI: COMPLETE (Phase 4). Deployment: see below.

## Live app

`APP/` is a mobile-first Vite + React single-page app, deployed via GitHub Pages on every push to `main`.

Once deployment finishes: **https://SoheylEbrahimzadeh.github.io/leben-in-deutschland-trainer/**

## What the app does

- Active-recall practice on all 300 General + 10 Hessen questions: the German original question and options are shown first, and only after you pick an answer does it reveal correct/incorrect plus the Persian translation, explanation, memory trick, common trap, and keywords.
- Per-question progress tracked locally on your device (localStorage), and optionally in the cloud when signed in (see "Cloud sync" below): attempts, correct/wrong, mistake count, status (MASTERED / UNCERTAIN / WEAK), and a RED ALERT flag once a question has been missed 3+ times.
- Error-first adaptive training: RED ALERT questions surface first, then WEAK, then UNCERTAIN, then not-yet-practiced questions, with MASTERED questions cycled back in periodically for review.
- A dedicated Hessen section for the 10 state-specific questions, kept separate from General practice.
- A 33-question mock exam (30 General + 3 Hessen, matching the real exam's structure) with no hints, no translations, and no answer reveal until you finish — then a full score breakdown, plus a full **Exam Review**: every one of the 33 questions as an expandable accordion item (any number can be open at once), showing your answer, the correct answer, and the same Persian translation/explanation/memory trick/trap/keywords used in Train mode, with an "only wrong answers" filter. The review always replays the exact exam you just took — nothing is re-randomized — and the last completed exam stays reachable from the Mock Exam tab's idle screen after navigating away or reloading.
- A dashboard summarizing progress, Hessen progress, latest/best mock score, RED ALERT count, and a recommended next step.
- Inter (Latin/German UI text) and Vazirmatn (Persian/Arabic text) are bundled locally via `@fontsource` (see `APP/src/fonts.js`) and served from the app's own origin — no Google Fonts network request.

## Verified dataset

- General questions (Teil I): 300 / 300 (G001-G300)
- Hessen questions (Teil II): 10 / 10 (H01-H10)
- Total: 310 / 310
- Source: verified live against the official BAMF test tool (oet.bamf.de, f?p=514), Bundesland = Hessen
- Verification details and methodology: see `DATA/source-verification.md`
- Full question index: see `DATA/question-index.md`

## Cloud sync (optional, off by default)

The app works fully offline/guest with localStorage only — signing in is never required. When you want progress to follow you across browsers/devices, it can optionally sync to a [Supabase](https://supabase.com) project (Postgres + Auth), chosen because it needs no custom backend, has a free tier suitable for a small trainer app, and its anon/public key is safe to ship in a static frontend as long as Row Level Security is enabled (it is — see `supabase/schema.sql`).

**Enabling it** (repo owner only, one-time):

1. Create a free Supabase project.
2. In its SQL editor, run `supabase/schema.sql` (creates `question_progress` and `exam_attempts`, both with RLS policies restricting every row to `auth.uid() = user_id`).
3. In Supabase → Authentication → Providers, enable Email sign-up/sign-in (on by default).
4. Copy the project's **URL** and **anon/public key** (Project Settings → API). Never copy the service-role key anywhere in this repo.
5. In the GitHub repo → Settings → Secrets and variables → Actions, add `SUPABASE_URL` and `SUPABASE_ANON_KEY` with those values. `.github/workflows/deploy.yml` passes them to the build as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
6. Push to `main` (or re-run the workflow) — the next deploy picks them up. Until they're set, the app silently stays in guest/local-only mode; nothing breaks either way.

For local development, copy `APP/.env.example` to `APP/.env.local` (gitignored) and fill in the same two values.

**What syncs**: per-question progress (attempts/correct/wrong/mistake count/streak) and mock exam history (including the full per-question review data), keyed by the existing question IDs — never the question text/options/translations themselves, which stay bundled locally from the immutable `DATA/*.md` source.

**Merge behavior** (see `APP/src/lib/progressMerge.js`): the first time a device with existing local (guest) progress signs in, it is asked whether to import that progress into the account rather than doing it silently. If it imports, each question is merged one whole record at a time (never a field-by-field blend, since a record's counters only make sense together): the record with more tracked mistakes wins first, then the one with more attempts, then the more recently updated one — so a merge can never overwrite a stronger/more-informative record with a weaker one. Mock exam history is a straight union, de-duplicated by timestamp. On every later sign-in, the same merge runs automatically (safe to repeat — merging identical data with itself is a no-op) so a second device's newer progress is picked up too.

**Offline behavior**: every answer/exam always writes to localStorage first and instantly, regardless of network state — nothing about using the app requires connectivity. When signed in, each write is also pushed to Supabase in the background; if that push fails (offline), it's queued in localStorage (`APP/src/lib/syncQueue.js`) and retried when the browser's `online` event fires or the app reloads. This is a small best-effort queue, not a full offline-sync engine — a write that's still queued when the user explicitly signs out is given one last flush attempt but isn't guaranteed to land before local progress resets (see below), which is a known, accepted limitation for this app's scale.

**Sign-out**: clears this device's local progress (it's already safely in the cloud and comes back on the next sign-in) so a different account signing in afterward on the same browser never sees the previous account's data.

## Repository structure

```
leben-in-deutschland-trainer/
├── README.md
├── MASTER-PROMPT.md
├── .github/workflows/deploy.yml   builds APP/ and deploys it to GitHub Pages on push to main
├── DATA/
│   ├── bamf-general-300.md      verified German questions + options + correct answers (General)
│   ├── hessen-10.md             verified German questions + options + correct answers (Hessen)
│   ├── question-index.md        master index of all 310 questions
│   ├── source-verification.md   verification methodology and audit trail
│   └── teaching-cards.md        bilingual (German + Persian) teaching cards, 310/310
├── supabase/schema.sql           optional cloud-sync tables + Row Level Security policies (see "Cloud sync" above)
└── APP/                          the mobile-first learning engine (Vite + React)
    ├── .env.example               VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (optional, both public/client-safe)
    ├── scripts/parse-data.mjs    parses DATA/*.md into src/data/questions.generated.json at build time
    ├── src/fonts.js               bundles Inter + Vazirmatn locally (@fontsource) — no Google Fonts
    ├── src/lib/                  progress model, adaptive queue, mock-exam builder, cloud-sync + merge logic (pure, unit-tested)
    ├── src/components/           QuestionCard, ExamReview, AccountMenu, AuthPanel, MigrationPrompt, ...
    ├── src/views/                Dashboard, Train, Mistakes, Hessen, MockExam, Progress
    └── test/run-tests.mjs        data-integrity + logic test suite (`npm test`)
```

## Data integrity rule

The German question text, answer options, and correct answers in `DATA/bamf-general-300.md` and `DATA/hessen-10.md` are the single source of truth. They are never regenerated, rewritten, or re-answered from memory. `APP/scripts/parse-data.mjs` only reads `DATA/`; any row that doesn't parse cleanly is marked `NOT VERIFIED` in the generated data instead of being guessed, and the build fails outright if the combined count isn't exactly 310 or any ID is duplicated. Any correction to the source itself requires re-verification against the official source and is documented in `DATA/source-verification.md`.

## Local development

```
cd APP
npm install
npm run dev       # local dev server
npm test          # parses DATA/ + runs the logic/data-integrity test suite
npm run build     # production build to APP/dist
```

## Canonical source

GitHub repository: `SoheylEbrahimzadeh/leben-in-deutschland-trainer` (branch `main`) is the source of truth for this project.
