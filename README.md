# leben-in-deutschland-trainer

Leben-in-Deutschland / Einbürgerungstest prep trainer (Hessen), built for Armin.

## Status

Data phase: COMPLETE. Learning engine, mock exam, dashboard, mobile app UI: COMPLETE (Phase 4). Deployment: see below.

## Live app

`APP/` is a mobile-first Vite + React single-page app, deployed via GitHub Pages on every push to `main`.

Once deployment finishes: **https://SoheylEbrahimzadeh.github.io/leben-in-deutschland-trainer/**

## What the app does

- Active-recall practice on all 300 General + 10 Hessen questions: the German original question and options are shown first, and only after you pick an answer does it reveal correct/incorrect plus the Persian translation, explanation, memory trick, common trap, and keywords.
- Per-question progress tracked locally on your device (localStorage): attempts, correct/wrong, mistake count, status (MASTERED / UNCERTAIN / WEAK), and a RED ALERT flag once a question has been missed 3+ times.
- Error-first adaptive training: RED ALERT questions surface first, then WEAK, then UNCERTAIN, then not-yet-practiced questions, with MASTERED questions cycled back in periodically for review.
- A dedicated Hessen section for the 10 state-specific questions, kept separate from General practice.
- A 33-question mock exam (30 General + 3 Hessen, matching the real exam's structure) with no hints, no translations, and no answer reveal until you finish — then a full score breakdown and mistake list.
- A dashboard summarizing progress, Hessen progress, latest/best mock score, RED ALERT count, and a recommended next step.

## Verified dataset

- General questions (Teil I): 300 / 300 (G001-G300)
- Hessen questions (Teil II): 10 / 10 (H01-H10)
- Total: 310 / 310
- Source: verified live against the official BAMF test tool (oet.bamf.de, f?p=514), Bundesland = Hessen
- Verification details and methodology: see `DATA/source-verification.md`
- Full question index: see `DATA/question-index.md`

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
└── APP/                          the mobile-first learning engine (Vite + React)
    ├── scripts/parse-data.mjs    parses DATA/*.md into src/data/questions.generated.json at build time
    ├── src/lib/                  progress model, adaptive queue, mock-exam builder (pure, unit-tested)
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
