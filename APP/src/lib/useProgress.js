import { useSyncExternalStore, useCallback } from "react";
import {
  getState,
  subscribe,
  recordAnswer,
  recordMockExam,
  resetAllProgress,
} from "./progressStore.js";

/** React hook giving live access to the shared, localStorage-backed progress state. */
export function useProgress() {
  const state = useSyncExternalStore(subscribe, getState, getState);

  const answer = useCallback((questionId, selectedLetter, correctLetter) => {
    return recordAnswer(questionId, selectedLetter, correctLetter);
  }, []);

  const submitMockExam = useCallback((result) => {
    return recordMockExam(result);
  }, []);

  const resetAll = useCallback(() => {
    resetAllProgress();
  }, []);

  return { state, answer, submitMockExam, resetAll };
}
