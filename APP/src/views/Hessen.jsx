import { useMemo, useState } from "react";
import { useProgress } from "../lib/useProgress.js";
import { HESSEN_QUESTIONS } from "../lib/questions.js";
import { buildAdaptiveQueue, bucketCounts } from "../lib/adaptiveQueue.js";
import QuestionCard from "../components/QuestionCard.jsx";

/** Dedicated section for the 10 Hessen-specific questions, kept separate
 * from the 300 General questions per the project's Hessen-mode rule. */
export default function Hessen() {
  const { state, answer } = useProgress();
  const [sessionKey, setSessionKey] = useState(0);
  const [index, setIndex] = useState(0);

  const queue = useMemo(
    () => buildAdaptiveQueue(HESSEN_QUESTIONS, state.perQuestion, { reviewEvery: 4 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionKey]
  );
  const buckets = useMemo(() => bucketCounts(HESSEN_QUESTIONS, state.perQuestion), [state]);

  let completed = 0;
  let correct = 0;
  let wrong = 0;
  for (const q of HESSEN_QUESTIONS) {
    const r = state.perQuestion[q.id];
    if (r && r.attempts > 0) {
      completed += 1;
      correct += r.correct;
      wrong += r.wrong;
    }
  }

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
      <h2 className="section-title">هسن · Hessen (10 Fragen)</h2>
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="stat-box">
          <div className="value">{completed}/10</div>
          <div className="label">تمرین‌شده</div>
        </div>
        <div className="stat-box good">
          <div className="value">{correct}</div>
          <div className="label">درست</div>
        </div>
        <div className="stat-box">
          <div className="value">{wrong}</div>
          <div className="label">غلط</div>
        </div>
        <div className="stat-box alert">
          <div className="value">{buckets.redAlert + buckets.weak}</div>
          <div className="label">سؤالات ضعیف</div>
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
          <p className="fa">همه سؤالات هسن تمرین شد! 🎉</p>
          <button type="button" className="btn" style={{ marginTop: 10 }} onClick={restart}>
            دوباره تمرین کن · Nochmal üben
          </button>
        </div>
      )}
    </div>
  );
}
