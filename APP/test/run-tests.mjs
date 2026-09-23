#!/usr/bin/env node
// Lightweight dependency-free test runner for the app's pure logic.
// Run via `npm test` (runs the data parser first, then this file).
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeStatus,
  applyAnswer,
  isRedAlert,
  emptyQuestionRecord,
  STATUS,
  RED_ALERT_THRESHOLD,
} from "../src/lib/progressStore.js";
import { buildAdaptiveQueue, shuffle, bucketCounts } from "../src/lib/adaptiveQueue.js";
import { buildMockExam, scoreMockExam, filterExamResults, MOCK_EXAM_TOTAL, MOCK_EXAM_GENERAL_COUNT, MOCK_EXAM_HESSEN_COUNT } from "../src/lib/mockExam.js";
import { mergePerQuestion, mergeMockExams, mergeProgressState } from "../src/lib/progressMerge.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const questions = JSON.parse(
  readFileSync(path.resolve(__dirname, "../src/data/questions.generated.json"), "utf8")
);

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass += 1;
  } else {
    fail += 1;
    console.error(`FAIL: ${msg}`);
  }
}

// --- Data integrity -------------------------------------------------
assert(questions.length === 310, `expected 310 questions, got ${questions.length}`);
const generalQs = questions.filter((q) => q.category === "General");
const hessenQs = questions.filter((q) => q.category === "Hessen");
assert(generalQs.length === 300, `expected 300 General, got ${generalQs.length}`);
assert(hessenQs.length === 10, `expected 10 Hessen, got ${hessenQs.length}`);

const ids = new Set(questions.map((q) => q.id));
assert(ids.size === 310, "no duplicate question IDs");

for (const q of questions) {
  assert(["A", "B", "C", "D"].includes(q.correctAnswer), `${q.id}: correctAnswer must be A-D`);
  assert(!!q.options.A && !!q.options.B && !!q.options.C && !!q.options.D, `${q.id}: all 4 options present`);
  assert(!!q.question, `${q.id}: question text present`);
  assert(q.flagged === null, `${q.id}: not flagged NOT VERIFIED`);
  assert(!!q.persian, `${q.id}: has Persian teaching content`);
}

const expectedGeneralIds = new Set(Array.from({ length: 300 }, (_, i) => `G${String(i + 1).padStart(3, "0")}`));
for (const id of expectedGeneralIds) assert(ids.has(id), `missing expected General id ${id}`);
const expectedHessenIds = new Set(Array.from({ length: 10 }, (_, i) => `H${String(i + 1).padStart(2, "0")}`));
for (const id of expectedHessenIds) assert(ids.has(id), `missing expected Hessen id ${id}`);

// --- Progress model ---------------------------------------------------
{
  let r = emptyQuestionRecord();
  assert(computeStatus(r) === STATUS.UNPRACTICED, "no attempts => UNPRACTICED");

  r = applyAnswer(r, "A", "A"); // correct
  assert(r.attempts === 1 && r.correct === 1 && r.streak === 1, "1 correct answer applied");
  assert(computeStatus(r) === STATUS.UNCERTAIN, "1 correct, streak<2 => UNCERTAIN");

  r = applyAnswer(r, "A", "A"); // correct again -> streak 2
  assert(r.streak === 2, "streak reaches 2 after 2 correct in a row");
  assert(computeStatus(r) === STATUS.MASTERED, "streak>=2, no mistakes => MASTERED");

  r = applyAnswer(r, "B", "A"); // wrong -> resets streak, mistake 1
  assert(r.mistakeCount === 1 && r.streak === 0, "wrong answer increments mistakeCount and resets streak");
  assert(computeStatus(r) === STATUS.WEAK, "1 mistake, streak 0 => WEAK");
  assert(!isRedAlert(r), "1 mistake is not yet RED ALERT");

  r = applyAnswer(r, "B", "A"); // wrong again -> mistake 2
  r = applyAnswer(r, "B", "A"); // wrong again -> mistake 3
  assert(r.mistakeCount === RED_ALERT_THRESHOLD, `3rd mistake reaches RED_ALERT_THRESHOLD (${RED_ALERT_THRESHOLD})`);
  assert(isRedAlert(r), "3+ mistakes => RED ALERT");
  assert(computeStatus(r) === STATUS.WEAK, "RED ALERT question still reports WEAK status");

  // Even a big correct streak after 3+ mistakes must not silently clear RED ALERT.
  r = applyAnswer(r, "A", "A");
  r = applyAnswer(r, "A", "A");
  r = applyAnswer(r, "A", "A");
  assert(isRedAlert(r), "RED ALERT persists (mistakeCount never decreases) even after a later correct streak");
}

// --- Adaptive queue priority -------------------------------------------
{
  const sample = generalQs.slice(0, 20);
  const perQuestion = {};
  // sample[0] => RED ALERT, sample[1] => WEAK, sample[2] => UNCERTAIN, sample[3] => MASTERED
  let r = emptyQuestionRecord();
  r = applyAnswer(r, "X", "A");
  r = applyAnswer(r, "X", "A");
  r = applyAnswer(r, "X", "A");
  perQuestion[sample[0].id] = r; // 3 mistakes => RED ALERT

  r = emptyQuestionRecord();
  r = applyAnswer(r, "X", "A");
  perQuestion[sample[1].id] = r; // 1 mistake => WEAK

  r = emptyQuestionRecord();
  r = applyAnswer(r, sample[2].correctAnswer, sample[2].correctAnswer);
  perQuestion[sample[2].id] = r; // 1 correct, streak 1 => UNCERTAIN

  r = emptyQuestionRecord();
  r = applyAnswer(r, sample[3].correctAnswer, sample[3].correctAnswer);
  r = applyAnswer(r, sample[3].correctAnswer, sample[3].correctAnswer);
  perQuestion[sample[3].id] = r; // streak 2 => MASTERED
  // sample[4..19] left UNPRACTICED

  const queue = buildAdaptiveQueue(sample, perQuestion, { rng: () => 0.42, reviewEvery: 1000 });
  const posOf = (id) => queue.findIndex((q) => q.id === id);
  assert(posOf(sample[0].id) < posOf(sample[1].id), "RED ALERT question comes before WEAK");
  assert(posOf(sample[1].id) < posOf(sample[2].id), "WEAK question comes before UNCERTAIN");
  assert(posOf(sample[2].id) < posOf(sample[4].id), "UNCERTAIN question comes before UNPRACTICED");
  assert(posOf(sample[4].id) < posOf(sample[3].id), "UNPRACTICED comes before MASTERED (periodic review, sent last)");

  const buckets = bucketCounts(sample, perQuestion);
  assert(buckets.redAlert === 1 && buckets.weak === 1 && buckets.uncertain === 1 && buckets.mastered === 1 && buckets.unpracticed === 16, "bucketCounts matches expected distribution");
}

// --- Mock exam composition ---------------------------------------------
{
  const exam = buildMockExam(questions, { rng: mulberry32(12345) });
  assert(exam.length === MOCK_EXAM_TOTAL, `mock exam has exactly ${MOCK_EXAM_TOTAL} questions`);
  const examIds = new Set(exam.map((q) => q.id));
  assert(examIds.size === MOCK_EXAM_TOTAL, "mock exam has no duplicate questions");
  const g = exam.filter((q) => q.category === "General").length;
  const h = exam.filter((q) => q.category === "Hessen").length;
  assert(g === MOCK_EXAM_GENERAL_COUNT, `mock exam has ${MOCK_EXAM_GENERAL_COUNT} General questions, got ${g}`);
  assert(h === MOCK_EXAM_HESSEN_COUNT, `mock exam has ${MOCK_EXAM_HESSEN_COUNT} Hessen questions, got ${h}`);
  for (const q of exam) {
    const original = questions.find((oq) => oq.id === q.id);
    assert(
      q.options.A === original.options.A &&
        q.options.B === original.options.B &&
        q.options.C === original.options.C &&
        q.options.D === original.options.D,
      `${q.id}: mock exam option order matches original source order (never reshuffled)`
    );
  }

  // Score it: answer everything correctly except the first 5.
  const answers = {};
  exam.forEach((q, i) => {
    answers[q.id] = i < 5 ? (q.correctAnswer === "A" ? "B" : "A") : q.correctAnswer;
  });
  const scored = scoreMockExam(exam, answers);
  assert(scored.correct === MOCK_EXAM_TOTAL - 5, "scoreMockExam counts correct answers accurately");
  assert(scored.mistakes.length === 5, "scoreMockExam records exactly the wrong answers as mistakes");
  assert(scored.total === MOCK_EXAM_TOTAL, "scoreMockExam total matches exam length");

  // --- scoreMockExam().results (full per-question replay for exam review) ---
  assert(Array.isArray(scored.results), "scoreMockExam returns a results array");
  assert(scored.results.length === MOCK_EXAM_TOTAL, `scoreMockExam results has all ${MOCK_EXAM_TOTAL} questions, not just mistakes`);
  scored.results.forEach((r, i) => {
    const q = exam[i];
    assert(r.id === q.id, `results[${i}].id matches exam order (question ${q.id})`);
    assert(r.selected === answers[q.id], `results[${i}].selected matches the recorded answer for ${q.id}`);
    assert(r.correct === q.correctAnswer, `results[${i}].correct matches the source correct answer for ${q.id}`);
    assert(r.isCorrect === (r.selected === r.correct), `results[${i}].isCorrect matches selected === correct for ${q.id}`);
  });
  const resultsWrongCount = scored.results.filter((r) => !r.isCorrect).length;
  assert(resultsWrongCount === scored.mistakes.length, "results wrong-count matches mistakes.length");
  const mistakeIds = new Set(scored.mistakes.map((m) => m.id));
  scored.results.forEach((r) => {
    assert(r.isCorrect ? !mistakeIds.has(r.id) : mistakeIds.has(r.id), `results[${r.id}].isCorrect is consistent with the mistakes list`);
  });

  // --- filterExamResults ---
  const allFiltered = filterExamResults(scored.results, "all");
  assert(allFiltered.length === MOCK_EXAM_TOTAL, 'filterExamResults(results, "all") keeps every question');
  assert(allFiltered.every((r, i) => r === scored.results[i]), 'filterExamResults(results, "all") preserves order and identity');
  const defaultFiltered = filterExamResults(scored.results);
  assert(defaultFiltered.length === MOCK_EXAM_TOTAL, "filterExamResults defaults to keeping every question when mode is omitted");
  const wrongFiltered = filterExamResults(scored.results, "wrong");
  assert(wrongFiltered.length === 5, 'filterExamResults(results, "wrong") returns exactly the incorrect answers');
  assert(wrongFiltered.every((r) => !r.isCorrect), 'filterExamResults(results, "wrong") never includes a correct answer');
  assert(
    wrongFiltered.every((r) => mistakeIds.has(r.id)) && wrongFiltered.length === mistakeIds.size,
    'filterExamResults(results, "wrong") matches the mistakes list exactly'
  );
}

// deterministic PRNG so the shuffle-based tests above are reproducible
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// shuffle sanity check (not a correctness proof, just "doesn't crash / keeps all elements")
{
  const arr = [1, 2, 3, 4, 5];
  const shuffled = shuffle(arr, mulberry32(1));
  assert(shuffled.length === arr.length, "shuffle preserves length");
  assert([...shuffled].sort().join(",") === arr.join(","), "shuffle preserves the same elements");
}

// --- Cloud-sync merge logic (progressMerge.js) --------------------------
// Pure, provider-agnostic — see progressMerge.js's header comment for the
// documented merge rules this asserts against.
{
  // 1) A question present on only one side is kept as-is.
  const onlyLocal = { Q001: { attempts: 2, correct: 2, wrong: 0, mistakeCount: 0, streak: 2, lastAttemptAt: "2026-01-01T00:00:00.000Z" } };
  const onlyCloud = { Q002: { attempts: 1, correct: 0, wrong: 1, mistakeCount: 1, streak: 0, lastAttemptAt: "2026-01-01T00:00:00.000Z" } };
  const mergedOneSided = mergePerQuestion(onlyLocal, onlyCloud);
  assert(mergedOneSided.Q001 === onlyLocal.Q001, "mergePerQuestion keeps a question that only exists locally");
  assert(mergedOneSided.Q002 === onlyCloud.Q002, "mergePerQuestion keeps a question that only exists in the cloud");

  // 2) Higher mistakeCount wins first, even if it has fewer attempts —
  // mistake/RED-ALERT history is never silently discarded.
  const weakerButMoreAttempts = { attempts: 10, correct: 10, wrong: 0, mistakeCount: 0, streak: 10, lastAttemptAt: "2026-01-01T00:00:00.000Z" };
  const fewerAttemptsButRedAlert = { attempts: 4, correct: 1, wrong: 3, mistakeCount: 3, streak: 0, lastAttemptAt: "2025-01-01T00:00:00.000Z" };
  const mergedMistakePriority = mergePerQuestion(
    { Q003: weakerButMoreAttempts },
    { Q003: fewerAttemptsButRedAlert }
  );
  assert(
    mergedMistakePriority.Q003 === fewerAttemptsButRedAlert,
    "mergePerQuestion prefers the record with more tracked mistakes over the one with more attempts"
  );

  // 3) Equal mistakeCount -> higher attempts wins.
  const fewerAttempts = { attempts: 3, correct: 2, wrong: 1, mistakeCount: 1, streak: 0, lastAttemptAt: "2025-06-01T00:00:00.000Z" };
  const moreAttempts = { attempts: 7, correct: 6, wrong: 1, mistakeCount: 1, streak: 3, lastAttemptAt: "2025-01-01T00:00:00.000Z" };
  const mergedAttemptsPriority = mergePerQuestion({ Q004: fewerAttempts }, { Q004: moreAttempts });
  assert(mergedAttemptsPriority.Q004 === moreAttempts, "mergePerQuestion prefers more attempts when mistakeCount ties");

  // 4) Equal mistakeCount and attempts -> most recent lastAttemptAt wins.
  const older = { attempts: 5, correct: 4, wrong: 1, mistakeCount: 1, streak: 1, lastAttemptAt: "2025-01-01T00:00:00.000Z" };
  const newer = { attempts: 5, correct: 4, wrong: 1, mistakeCount: 1, streak: 1, lastAttemptAt: "2026-01-01T00:00:00.000Z" };
  const mergedTimePriority = mergePerQuestion({ Q005: older }, { Q005: newer });
  assert(mergedTimePriority.Q005 === newer, "mergePerQuestion prefers the more recent lastAttemptAt when mistakeCount and attempts both tie");

  // 5) Merging never invents a question that wasn't on either side.
  const mergedKeys = Object.keys(mergePerQuestion({ Q006: onlyLocal.Q001 }, { Q007: onlyCloud.Q002 })).sort();
  assert(mergedKeys.join(",") === "Q006,Q007", "mergePerQuestion's output keys are exactly the union of both sides' keys");

  // --- mockExams: union, de-duplicated by date, sorted chronologically ---
  const examA = { date: "2026-01-01T10:00:00.000Z", total: 33, correct: 20, wrong: 13, percentage: 60.6, mistakes: [], results: [{ id: "G001", selected: "A", correct: "A", isCorrect: true }] };
  const examB = { date: "2026-02-01T10:00:00.000Z", total: 33, correct: 25, wrong: 8, percentage: 75.8, mistakes: [], results: [{ id: "G002", selected: "B", correct: "B", isCorrect: true }] };
  const mergedExams = mergeMockExams([examA], [examB]);
  assert(mergedExams.length === 2, "mergeMockExams unions exams from both sides");
  assert(mergedExams[0].date === examA.date && mergedExams[1].date === examB.date, "mergeMockExams sorts the union chronologically");

  const examADuplicate = { date: examA.date, total: 33, correct: 20, wrong: 13, percentage: 60.6, mistakes: [] }; // no `results` (as if the cloud row somehow lacked it)
  const dedupedExams = mergeMockExams([examA], [examADuplicate]);
  assert(dedupedExams.length === 1, "mergeMockExams de-duplicates same-timestamp exams instead of listing both");
  assert(Array.isArray(dedupedExams[0].results) && dedupedExams[0].results.length === 1, "mergeMockExams keeps the fuller (results-carrying) entry on a timestamp collision");

  // --- mergeProgressState: end-to-end shape ---
  const fullMerged = mergeProgressState(
    { perQuestion: { Q001: onlyLocal.Q001 }, mockExams: [examA] },
    { perQuestion: { Q002: onlyCloud.Q002 }, mockExams: [examB] }
  );
  assert(fullMerged.version === 1, "mergeProgressState stamps version: 1");
  assert(Object.keys(fullMerged.perQuestion).sort().join(",") === "Q001,Q002", "mergeProgressState merges perQuestion from both sides");
  assert(fullMerged.mockExams.length === 2, "mergeProgressState merges mockExams from both sides");
}

console.log(`\n${pass} passed, ${fail} failed.`);
if (fail > 0) process.exit(1);
