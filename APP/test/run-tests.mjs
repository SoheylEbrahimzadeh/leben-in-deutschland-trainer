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
import { buildMockExam, scoreMockExam, MOCK_EXAM_TOTAL, MOCK_EXAM_GENERAL_COUNT, MOCK_EXAM_HESSEN_COUNT } from "../src/lib/mockExam.js";

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

console.log(`\n${pass} passed, ${fail} failed.`);
if (fail > 0) process.exit(1);
