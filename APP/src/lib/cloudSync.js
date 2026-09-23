// Cloud-sync I/O layer: the only module that talks to Supabase tables
// directly. Converts between progressStore.js's local record shape and the
// supabase/schema.sql row shape, and orchestrates pull/merge/push. All the
// actual merge decision logic lives in progressMerge.js (pure, unit
// tested); this file is intentionally "dumb" glue plus network calls.
import { supabase, isCloudConfigured } from "./supabaseClient.js";
import { getQuestionById } from "./questions.js";
import { getState, replaceState } from "./progressStore.js";
import { mergeProgressState } from "./progressMerge.js";
import { enqueue, flushQueue } from "./syncQueue.js";

const MIGRATED_KEY_PREFIX = "lid-trainer-migrated-";

function hasLocalProgress(state) {
  return Object.keys(state.perQuestion || {}).length > 0 || (state.mockExams || []).length > 0;
}

function hasMigratedBefore(userId) {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(MIGRATED_KEY_PREFIX + userId) === "1";
  } catch {
    return false;
  }
}

function markMigrated(userId) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(MIGRATED_KEY_PREFIX + userId, "1");
  } catch {
    // best-effort
  }
}

// --- row <-> local-record shape converters -----------------------------

function recordToRow(userId, questionId, record) {
  const question = getQuestionById(questionId);
  return {
    user_id: userId,
    question_id: questionId,
    attempts: record.attempts,
    correct_count: record.correct,
    wrong_count: record.wrong,
    mistake_count: record.mistakeCount,
    confidence: record.streak,
    last_answer: record.lastSelected,
    correct_answer: question ? question.correctAnswer : null,
    updated_at: record.lastAttemptAt || new Date().toISOString(),
  };
}

function rowToRecord(row) {
  return {
    attempts: row.attempts,
    correct: row.correct_count,
    wrong: row.wrong_count,
    mistakeCount: row.mistake_count,
    streak: row.confidence,
    lastSelected: row.last_answer,
    lastCorrect: row.last_answer != null && row.correct_answer != null ? row.last_answer === row.correct_answer : null,
    lastAttemptAt: row.updated_at,
  };
}

function examToRow(userId, exam) {
  return {
    user_id: userId,
    exam_id: exam.date,
    created_at: exam.date,
    score: exam.correct,
    correct_count: exam.correct,
    wrong_count: exam.wrong,
    percentage: exam.percentage,
    question_results: exam.results || [],
  };
}

function rowToExam(row) {
  const results = Array.isArray(row.question_results) ? row.question_results : [];
  return {
    date: row.exam_id,
    total: row.correct_count + row.wrong_count,
    correct: row.correct_count,
    wrong: row.wrong_count,
    percentage: Number(row.percentage),
    results,
    mistakes: results.filter((r) => !r.isCorrect).map((r) => ({ id: r.id, selected: r.selected, correct: r.correct })),
  };
}

// --- single-record push (used right after each answer/exam) ------------

export async function pushQuestionProgress(userId, questionId, record) {
  if (!isCloudConfigured || !userId) return false;
  const { error } = await supabase.from("question_progress").upsert(recordToRow(userId, questionId, record));
  if (error) {
    enqueue({ type: "question", userId, questionId, record });
    return false;
  }
  return true;
}

export async function pushMockExam(userId, exam) {
  if (!isCloudConfigured || !userId) return false;
  const { error } = await supabase.from("exam_attempts").upsert(examToRow(userId, exam), { onConflict: "user_id,exam_id" });
  if (error) {
    enqueue({ type: "exam", userId, exam });
    return false;
  }
  return true;
}

/** Retries whatever is sitting in the offline queue, in order. */
export async function flushPendingSync() {
  if (!isCloudConfigured) return { flushed: 0, remaining: 0 };
  return flushQueue(async (entry) => {
    if (entry.type === "question") return pushQuestionProgress(entry.userId, entry.questionId, entry.record);
    if (entry.type === "exam") return pushMockExam(entry.userId, entry.exam);
    return true; // unknown entry type: drop it rather than looping forever
  });
}

// --- full pull ------------------------------------------------------------

async function pullCloudState(userId) {
  const [{ data: qRows, error: qErr }, { data: eRows, error: eErr }] = await Promise.all([
    supabase.from("question_progress").select("*").eq("user_id", userId),
    supabase.from("exam_attempts").select("*").eq("user_id", userId),
  ]);
  if (qErr) throw qErr;
  if (eErr) throw eErr;
  const perQuestion = {};
  for (const row of qRows || []) perQuestion[row.question_id] = rowToRecord(row);
  const mockExams = (eRows || []).map(rowToExam);
  return { perQuestion, mockExams };
}

/** Pushes an entire local state to the cloud (used after a merge, to make sure the merged/winning records are reflected server-side too). */
async function pushFullState(userId, state) {
  const qEntries = Object.entries(state.perQuestion || {});
  if (qEntries.length > 0) {
    const rows = qEntries.map(([id, record]) => recordToRow(userId, id, record));
    const { error } = await supabase.from("question_progress").upsert(rows);
    if (error) throw error;
  }
  const exams = state.mockExams || [];
  if (exams.length > 0) {
    const rows = exams.map((exam) => examToRow(userId, exam));
    const { error } = await supabase.from("exam_attempts").upsert(rows, { onConflict: "user_id,exam_id" });
    if (error) throw error;
  }
}

/**
 * Decides what should happen right after a user signs in. Never mutates
 * anything — the caller (authContext.jsx) applies the result so the UI can
 * show an import confirmation first when that's required. See
 * progressMerge.js's header comment for the merge rules.
 *
 * Returns one of:
 *   { action: "none" }                              cloud sync is not configured
 *   { action: "needsImportChoice", localState }      first login, local guest progress exists — ask the user
 *   { action: "applied", mergedState }               cloud state pulled + merged + applied automatically
 */
export async function planLoginSync(userId) {
  if (!isCloudConfigured || !userId) return { action: "none" };
  const localState = getState();
  if (!hasMigratedBefore(userId) && hasLocalProgress(localState)) {
    return { action: "needsImportChoice", localState };
  }
  const cloudState = await pullCloudState(userId);
  const merged = mergeProgressState(localState, cloudState);
  replaceState(merged);
  await pushFullState(userId, merged);
  markMigrated(userId);
  await flushPendingSync();
  return { action: "applied", mergedState: merged };
}

/** User answered "yes, import my local progress" to the first-login prompt. */
export async function importLocalProgressAndMerge(userId) {
  const localState = getState();
  const cloudState = await pullCloudState(userId);
  const merged = mergeProgressState(localState, cloudState);
  replaceState(merged);
  await pushFullState(userId, merged);
  markMigrated(userId);
  await flushPendingSync();
  return merged;
}

/** User answered "no, start fresh from my cloud account" — local guest data is left in localStorage untouched (never deleted) but not merged in. */
export async function skipLocalImport(userId) {
  const cloudState = await pullCloudState(userId);
  replaceState(cloudState);
  markMigrated(userId);
  await flushPendingSync();
  return cloudState;
}
