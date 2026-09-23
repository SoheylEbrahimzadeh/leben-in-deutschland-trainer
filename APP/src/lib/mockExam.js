import { shuffle } from "./adaptiveQueue.js";

export const MOCK_EXAM_TOTAL = 33;
export const MOCK_EXAM_GENERAL_COUNT = 30;
export const MOCK_EXAM_HESSEN_COUNT = 3;

/**
 * Builds one 33-question mock exam: 30 from the General pool + 3 from the
 * Hessen pool, matching the real Leben-in-Deutschland exam structure
 * (300 general questions + 10 state-specific, 33 drawn per sitting).
 * Question order is randomized; each question's own A/B/C/D order is left
 * exactly as in the verified source data (never reshuffled), so nothing
 * about the original source representation is altered.
 */
export function buildMockExam(questions, { rng = Math.random } = {}) {
  const general = questions.filter((q) => q.category === "General");
  const hessen = questions.filter((q) => q.category === "Hessen");
  if (general.length < MOCK_EXAM_GENERAL_COUNT || hessen.length < MOCK_EXAM_HESSEN_COUNT) {
    throw new Error(
      `Not enough questions for a mock exam: need ${MOCK_EXAM_GENERAL_COUNT} General + ${MOCK_EXAM_HESSEN_COUNT} Hessen, have ${general.length} + ${hessen.length}`
    );
  }
  const pickedGeneral = shuffle(general, rng).slice(0, MOCK_EXAM_GENERAL_COUNT);
  const pickedHessen = shuffle(hessen, rng).slice(0, MOCK_EXAM_HESSEN_COUNT);
  const combined = shuffle([...pickedGeneral, ...pickedHessen], rng);
  if (combined.length !== MOCK_EXAM_TOTAL) {
    throw new Error(`Mock exam assembled with ${combined.length} questions, expected ${MOCK_EXAM_TOTAL}`);
  }
  return combined;
}

/**
 * Scores a completed mock exam. `answers` maps questionId -> selected letter.
 *
 * `results` preserves the FULL exam in its original question order (all 33,
 * not just the mistakes) as {id, selected, correct, isCorrect} — this is
 * what the exam-review screen replays. It intentionally stores only the
 * question id, never a copy of the question text/options: those are looked
 * up from the immutable generated question data by id, so the verified
 * source is never duplicated. `mistakes` is kept for backward compatibility
 * with existing callers/persisted history entries.
 */
export function scoreMockExam(examQuestions, answers) {
  const results = [];
  const mistakes = [];
  let correctCount = 0;
  for (const q of examQuestions) {
    const selected = answers[q.id] ?? null;
    const isCorrect = selected === q.correctAnswer;
    if (isCorrect) correctCount += 1;
    else mistakes.push({ id: q.id, selected, correct: q.correctAnswer });
    results.push({ id: q.id, selected, correct: q.correctAnswer, isCorrect });
  }
  const total = examQuestions.length;
  return {
    date: new Date().toISOString(),
    total,
    correct: correctCount,
    wrong: total - correctCount,
    percentage: Math.round((correctCount / total) * 1000) / 10,
    mistakes,
    results,
  };
}

/**
 * Pure filter used by the exam-review UI: "all" keeps everything, "wrong"
 * keeps only incorrect answers. Extracted as a standalone function so it is
 * unit-testable without a browser/DOM.
 */
export function filterExamResults(results, mode = "all") {
  if (mode === "wrong") return results.filter((r) => !r.isCorrect);
  return results;
}
