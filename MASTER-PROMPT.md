# MASTER-PROMPT.md

Governing rules for all work on this project, as established with the project owner. This file records rules already agreed, not new decisions.

## Source of truth

- `SoheylEbrahimzadeh/leben-in-deutschland-trainer` (GitHub, branch `main`) is the canonical repository. Initial data migration is complete and independently verified (SHA-256 match against the Cloud workspace source for every `DATA/` file).
- Pushes happen through the project owner's own already-authenticated GitHub web session (browser automation), never through a Personal Access Token, Zapier, or the owner's local/Mac git.

## Data integrity (non-negotiable)

- The German question text, A/B/C/D options, and correct answer in `DATA/bamf-general-300.md` and `DATA/hessen-10.md` are copied verbatim from the verified BAMF source and are never regenerated, rewritten, simplified, or re-answered from memory.
- The Persian content in `DATA/teaching-cards.md` (translation, explanation, memory trick, trap, keywords) is an explanatory layer only — it never overrides or re-derives the correct answer.
- Verified dataset: 300 General (G001-G300) + 10 Hessen (H01-H10) = 310/310. Do not restart verification.
- Any suspected data issue is flagged and investigated, and fixed only with a newly verified source — never silently.

## Build order

1. Repository foundation (complete)
2. Data integration (complete)
3. Persian teaching-content layer (complete)
4. Learning engine (active recall, progress model, mistake tracking) — complete (`APP/src/lib/progressStore.js`, `APP/src/lib/adaptiveQueue.js`)
5. Mock exam (33 questions: 30 General + 3 Hessen, exam mode, no hints/reveal until submit) — complete (`APP/src/lib/mockExam.js`, `APP/src/views/MockExam.jsx`); a separate un-timed 33-question "baseline test" mode was not built as a distinct feature since the mock exam already covers a 33-question, no-hints assessment — flag this explicitly if a separate baseline mode is still wanted
6. Dashboard (real data only, never invented numbers) — complete (`APP/src/views/Dashboard.jsx`)
7. Mobile-first app UI — complete (`APP/src/index.css`, bottom-nav layout, verified at a 390×844 viewport via Playwright screenshots)
8. Testing — complete: `APP/test/run-tests.mjs` (data integrity + logic, run via `npm test`), plus a Playwright-driven end-to-end run of the full 33-question mock exam flow
9. Public deployment — GitHub Pages via `.github/workflows/deploy.yml`, triggered on push to `main`
10. Final verification — see the migration/deployment report delivered in chat for this round

Do not skip ahead to a later phase without an explicit instruction to do so. (Phase 4 onward was explicitly authorized and executed per the owner's instruction of 2026-09-23.)

## GitHub workflow discipline

- No claim of a successful push, commit, or migration without independently re-reading the result back from GitHub and confirming it matches the source.
- No new GitHub repository is created under any circumstance; there is exactly one canonical repository.
- No use of the project owner's local/Mac environment as the canonical project source.
- No request for a GitHub Personal Access Token unless every other supported access path has genuinely been exhausted.

## Learning engine framing (Phase 4, built)

- Question progress model: MASTERED / UNCERTAIN / WEAK, with a RED ALERT flag at mistake count >= 3. Implemented in `APP/src/lib/progressStore.js`; rules are unit-tested in `APP/test/run-tests.mjs`.
- The prioritization heuristic (`APP/src/lib/adaptiveQueue.js`) is a practical study aid, not a claim of scientifically validated spaced repetition.
- Progress persists per-device via `localStorage` only. There is no server and no account system, so progress does not sync across devices — this was not asked for and was not added.
