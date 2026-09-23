import { useMemo, useState } from "react";
import { useProgress } from "../lib/useProgress.js";
import { ALL_QUESTIONS } from "../lib/questions.js";
import { computeStatus, isRedAlert, STATUS } from "../lib/progressStore.js";
import { shuffle } from "../lib/adaptiveQueue.js";
import QuestionCard from "../components/QuestionCard.jsx";

export default function Mistakes() {
  const { state, answer } = useProgress();
  const [practicing, setPracticing] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [index, setIndex] = useState(0);

  const weakList = useMemo(() => {
    const rows = [];
    for (const q of ALL_QUESTIONS) {
      const r = state.perQuestion[q.id];
      const status = computeStatus(r);
      if (status === STATUS.WEAK) {
        rows.push({ q, r, redAlert: isRedAlert(r) });
      }
    }
    rows.sort((a, b) => (b.redAlert === a.redAlert ? b.r.mistakeCount - a.r.mistakeCount : b.redAlert ? 1 : -1));
    return rows;
  }, [state]);

  const queue = useMemo(() => shuffle(weakList.map((row) => row.q)), [sessionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (practicing) {
    const current = queue[index];
    const finished = index >= queue.length;
    return (
      <div>
        <h2 className="section-title">تمرین سؤالات ضعیف · Schwache Fragen</h2>
        {!finished && current && (
          <>
            <p style={{ color: "var(--text-dim)", fontSize: 12, marginBottom: 8 }}>
              {index + 1} / {queue.length}
            </p>
            <QuestionCard
              key={current.id + sessionKey}
              question={current}
              onAnswer={(letter) => answer(current.id, letter, current.correctAnswer)}
              onNext={() => setIndex((i) => i + 1)}
            />
          </>
        )}
        {(finished || queue.length === 0) && (
          <div className="card empty-state">
            <p className="fa">{queue.length === 0 ? "دیگر سؤال ضعیفی نداری! 🎉" : "تمرین سؤالات ضعیف تمام شد."}</p>
            <button
              type="button"
              className="btn"
              style={{ marginTop: 10 }}
              onClick={() => {
                setPracticing(false);
                setIndex(0);
              }}
            >
              بازگشت به لیست · Zurück
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title">اشتباهات و سؤالات ضعیف · Fehler & schwache Fragen</h2>
      {weakList.length === 0 ? (
        <div className="card empty-state">
          <p className="fa">فعلاً هیچ سؤال ضعیف یا RED ALERT‌ای نداری. عالیه! 🎉</p>
        </div>
      ) : (
        <>
          <button
            type="button"
            className="btn block-gap"
            onClick={() => {
              setSessionKey((k) => k + 1);
              setIndex(0);
              setPracticing(true);
            }}
          >
            تمرین همه سؤالات ضعیف ({weakList.length}) · Alle üben
          </button>
          <div className="card">
            {weakList.map(({ q, r, redAlert }) => (
              <div className="progress-row" key={q.id}>
                <span className="qid">{q.id}</span>
                <span className="qtext">{q.question}</span>
                {redAlert ? (
                  <span className="pill red-alert">RED {r.mistakeCount}</span>
                ) : (
                  <span className="pill weak">{r.mistakeCount}x</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
