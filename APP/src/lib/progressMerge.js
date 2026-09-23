// Pure, dependency-free localStorage <-> cloud progress merge logic.
// Deliberately has zero knowledge of Supabase (or any other backend): it
// only knows the same state shape progressStore.js already uses
// ({ perQuestion, mockExams }), so it is unit-testable exactly like the
// rest of the pure lib/ modules and can be reused if the cloud provider
// ever changes.
//
// MERGE BEHAVIOR (documented per the Part 3 requirement — read this before
// changing the logic below):
//
// Per-question records (`perQuestion`) are merged ONE WHOLE RECORD AT A
// TIME, never field-by-field. A record's counters (attempts/correct/wrong/
// mistakeCount/streak) are internally consistent with each other because
// they were produced together by applyAnswer() on one device; splicing
// individual fields from two different histories (e.g. the higher
// `attempts` from one side with the higher `mistakeCount` from the other)
// could produce a record that is not reachable by any real answer sequence
// (e.g. mistakeCount > wrong). So for each question id present on either
// side:
//   1. If only one side has a record for that question, keep it as-is.
//   2. If both sides have one, pick the "stronger" whole record using, in
//      order: (a) the higher mistakeCount — never silently lose tracked
//      RED ALERT / mistake history; (b) if tied, the higher attempts —
//      preserve the most practice; (c) if still tied, the more recent
//      lastAttemptAt — preserve the latest timestamp; (d) if still tied,
//      either is equivalent, so the local record is kept.
// This can never silently overwrite existing cloud progress with something
// weaker: the function only ever picks the record that already represents
// more (or equally as much) tracked history.
//
// Mock exam history (`mockExams`) is a plain union, de-duplicated by each
// exam's `date` field (already a unique client-generated ISO timestamp —
// the same value cloudSync.js uses as the cloud row's `exam_id`), then
// sorted chronologically. On the rare collision (same timestamp on both
// sides), the entry with the full `results` array is preferred, matching
// the "preserve strongest available progress state" rule.

function pickStrongerRecord(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.mistakeCount !== b.mistakeCount) return a.mistakeCount > b.mistakeCount ? a : b;
  if (a.attempts !== b.attempts) return a.attempts > b.attempts ? a : b;
  const aTime = a.lastAttemptAt ? Date.parse(a.lastAttemptAt) : 0;
  const bTime = b.lastAttemptAt ? Date.parse(b.lastAttemptAt) : 0;
  if (aTime !== bTime) return aTime > bTime ? a : b;
  return a;
}

export function mergePerQuestion(localPerQuestion = {}, cloudPerQuestion = {}) {
  const ids = new Set([...Object.keys(localPerQuestion), ...Object.keys(cloudPerQuestion)]);
  const merged = {};
  for (const id of ids) {
    merged[id] = pickStrongerRecord(localPerQuestion[id], cloudPerQuestion[id]);
  }
  return merged;
}

export function mergeMockExams(localExams = [], cloudExams = []) {
  const byDate = new Map();
  for (const exam of [...localExams, ...cloudExams]) {
    if (!exam || !exam.date) continue;
    const existing = byDate.get(exam.date);
    if (!existing) {
      byDate.set(exam.date, exam);
    } else {
      // Collision on the same timestamp: prefer whichever entry carries the
      // full per-question results array (needed for the exam-review screen).
      const existingHasResults = Array.isArray(existing.results);
      const incomingHasResults = Array.isArray(exam.results);
      if (incomingHasResults && !existingHasResults) byDate.set(exam.date, exam);
    }
  }
  return [...byDate.values()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

/** Merges a full local-shaped progress state with a full cloud-shaped one. */
export function mergeProgressState(local, cloud) {
  return {
    version: 1,
    perQuestion: mergePerQuestion(local?.perQuestion, cloud?.perQuestion),
    mockExams: mergeMockExams(local?.mockExams, cloud?.mockExams),
  };
}
