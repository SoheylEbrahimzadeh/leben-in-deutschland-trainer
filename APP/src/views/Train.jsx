import { useMemo, useState } from "react";
import { useProgress } from "../lib/useProgress.js";
import { GENERAL_QUESTIONS } from "../lib/questions.js";
import { buildAdaptiveQueue, bucketCounts } from "../lib/adaptiveQueue.js";
import QuestionCard from "../components/QuestionCard.jsx";

/**
 * Error-first adaptive practice over the 300 General questions.
 * Hessen questions are deliberately excluded here — see HESSEN MODE.
 */
export default function Train() {
  const { state, answer } = useProgress();
  const [sessionKey, setSessionKey] = useState(0);
  const [index, setIndex] = useState(0);

  const queue = useMemo(
    () => buildAdaptiveQueue(GENERAL_QUESTIONS, state.perQuestion),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionKey]
  );
  const buckets = useMemo(() => bucketCounts(GENERAL_QUESTIONS, state.perQuestion), [state]);

  const current = queue[index];
  const finished = index >= queue.length;

  function handleAnswer(letter) {
    answer(current.id, letter, current.correctAnswer);
  }

  function handleNext() {
    setIndex((i) => i + 1);
  }

  function restart() {
    setSessionKey((k) => k + 1);
    setIndex(0);
  }

  return (
    <div>
      <h2 className="section-title">تمرین فعال · Aktives Training (Allgemein)</h2>
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="stat-box alert">
          <div className="value">{buckets.redAlert}</div>
          <div className="label">RED ALERT</div>
        </div>
        <div className="stat-box">
          <div className="value">{buckets.weak}</div>
          <div className="label">ضعیف</div>
        </div>
        <div className="stat-box">
          <div className="value">{buckets.uncertain}</div>
          <div className="label">نامطمئن</div>
        </div>
        <div className="stat-box good">
          <div className="value">{buckets.mastered}</div>
          <div className="label">مسلط</div>
        </div>
      </div>

      {!finished && current && (
        <>
          <p style={{ color: "var(--text-dim)", fontSize: 12, marginBottom: 8 }}>
            {index + 1} / {queue.length}
          </p>
          <QuestionCard key={current.id + sessionKey} question={current} onAnswer={handleAnswer} onNext={handleNext} />
        </>
      )}

      {finished && (
        <div className="card empty-state">
          <p className="fa">این دوره تمرین تمام شد! 🎉</p>
          <button type="button" className="btn" style={{ marginTop: 10 }} onClick={restart}>
            شروع دوره جدید · Neue Runde
          </button>
        </div>
      )}
    </div>
  );
}
