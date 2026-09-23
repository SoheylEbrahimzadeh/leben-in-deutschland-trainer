// Local, per-device progress tracking for the LiD trainer.
// Persisted to localStorage so closing/reopening the app never loses progress.
// Pure functions here are unit-tested in test/run-tests.mjs without needing a browser.

export const STORAGE_KEY = "lid-trainer-progress-v1";

export const STATUS = {
  UNPRACTICED: "UNPRACTICED",
  MASTERED: "MASTERED",
  UNCERTAIN: "UNCERTAIN",
  WEAK: "WEAK",
};

export const RED_ALERT_THRESHOLD = 3;
export const MASTERED_STREAK = 2;

export function emptyQuestionRecord() {
  return {
    attempts: 0,
    correct: 0,
    wrong: 0,
    mistakeCount: 0,
    streak: 0,
    lastSelected: null,
    lastCorrect: null,
    lastAttemptAt: null,
  };
}

export function emptyState() {
  return {
    version: 1,
    perQuestion: {},
    mockExams: [],
  };
}

/** Pure status/RED ALERT computation from a single question record. */
export function computeStatus(record) {
  if (!record || record.attempts === 0) return STATUS.UNPRACTICED;
  if (record.mistakeCount >= RED_ALERT_THRESHOLD) return STATUS.WEAK;
  if (record.streak >= MASTERED_STREAK) return STATUS.MASTERED;
  if (record.mistakeCount >= 1) return STATUS.WEAK;
  return STATUS.UNCERTAIN;
}

export function isRedAlert(record) {
  return !!record && record.mistakeCount >= RED_ALERT_THRESHOLD;
}

/** Pure reducer: apply one answer to a question record, returns a NEW record. */
export function applyAnswer(record, selectedLetter, correctLetter) {
  const r = record ? { ...record } : emptyQuestionRecord();
  const wasCorrect = selectedLetter === correctLetter;
  r.attempts += 1;
  r.lastSelected = selectedLetter;
  r.lastCorrect = wasCorrect;
  r.lastAttemptAt = new Date().toISOString();
  if (wasCorrect) {
    r.correct += 1;
    r.streak += 1;
  } else {
    r.wrong += 1;
    r.mistakeCount += 1;
    r.streak = 0;
  }
  return r;
}

export function loadState() {
  if (typeof localStorage === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.perQuestion) {
      return emptyState();
    }
    return { ...emptyState(), ...parsed };
  } catch {
    return emptyState();
  }
}

export function saveState(state) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // best-effort; a full/blocked localStorage should never crash the app
  }
}

/** Simple pub-sub so multiple components re-render after a write. */
const listeners = new Set();
let cachedState = null;

export function getState() {
  if (!cachedState) cachedState = loadState();
  return cachedState;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) fn(cachedState);
}

export function recordAnswer(questionId, selectedLetter, correctLetter) {
  const state = getState();
  const prevRecord = state.perQuestion[questionId];
  const nextRecord = applyAnswer(prevRecord, selectedLetter, correctLetter);
  cachedState = {
    ...state,
    perQuestion: { ...state.perQuestion, [questionId]: nextRecord },
  };
  saveState(cachedState);
  notify();
  return nextRecord;
}

export function recordMockExam(result) {
  const state = getState();
  cachedState = {
    ...state,
    mockExams: [...state.mockExams, result],
  };
  saveState(cachedState);
  notify();
  return cachedState;
}

export function resetAllProgress() {
  cachedState = emptyState();
  saveState(cachedState);
  notify();
}

/**
 * Replaces the whole local state (persists + notifies), used by the cloud
 * sync layer to apply a login-time merge result. Kept as a thin, explicit
 * function rather than exposing `cachedState` directly, so every write
 * still goes through the same persist+notify path as recordAnswer/
 * recordMockExam.
 */
export function replaceState(nextState) {
  cachedState = { ...emptyState(), ...nextState };
  saveState(cachedState);
  notify();
  return cachedState;
}
