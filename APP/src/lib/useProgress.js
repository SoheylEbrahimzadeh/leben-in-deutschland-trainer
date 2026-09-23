import { useSyncExternalStore, useCallback } from "react";
import {
  getState,
  subscribe,
  recordAnswer,
  recordMockExam,
  resetAllProgress,
} from "./progressStore.js";
import { useAuth } from "./authContext.jsx";
import { pushQuestionProgress, pushMockExam } from "./cloudSync.js";

/**
 * React hook giving live access to the shared, localStorage-backed progress
 * state. localStorage is always the source of truth for the UI (instant,
 * offline-safe); when signed in and cloud sync is configured, each write is
 * ALSO mirrored to Supabase in the background (queued for retry if the
 * network is down — see syncQueue.js). A guest (no session, or cloud sync
 * not configured) sees zero behavior change from before Part 3.
 */
export function useProgress() {
  const state = useSyncExternalStore(subscribe, getState, getState);
  const { user, isCloudConfigured } = useAuth();

  const answer = useCallback(
    (questionId, selectedLetter, correctLetter) => {
      const record = recordAnswer(questionId, selectedLetter, correctLetter);
      if (isCloudConfigured && user?.id) {
        pushQuestionProgress(user.id, questionId, record);
      }
      return record;
    },
    [user, isCloudConfigured]
  );

  const submitMockExam = useCallback(
    (result) => {
      const next = recordMockExam(result);
      if (isCloudConfigured && user?.id) {
        pushMockExam(user.id, result);
      }
      return next;
    },
    [user, isCloudConfigured]
  );

  const resetAll = useCallback(() => {
    resetAllProgress();
  }, []);

  return { state, answer, submitMockExam, resetAll };
}
