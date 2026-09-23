import { useMemo, useState } from "react";
import { useProgress } from "../lib/useProgress.js";
import { ALL_QUESTIONS } from "../lib/questions.js";
import { computeStatus, isRedAlert, STATUS } from "../lib/progressStore.js";
import { shuffle } from "../lib/adaptiveQueue.js";
import QuestionCard from "../components/QuestionCard.jsx";
import { CheckCircleIcon, ChevronIcon } from "../components/Icons.jsx";

const GROUPS = [
  { key: "redAlert", label: "RED ALERT", pillClass: "red-alert", openByDefault: true },
  { key: STATUS.WEAK, label: "ضعیف · Schwach", pillClass: "weak", openByDefault: true },
  { key: STATUS.UNCERTAIN, label: "نامطمئن · Unsicher", pillClass: "uncertain", openByDefault: false },
];

export default function Mistakes() {
  const { state, answer } = useProgress();
  const [practicing, setPracticing] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [index, setIndex] = useState(0);

  const grouped = useMemo(() => {
    const g = { redAlert: [], [STATUS.WEAK]: [], [STATUS.UNCERTAIN]: [] };
    for (const q of ALL_QUESTIONS) {
      const r = state.perQuestion[q.id];
      if (isRedAlert(r)) {
        g.redAlert.push({ q, r });
        continue;
      }
      const status = computeStatus(r);
      if (status === STATUS.WEAK || status === STATUS.UNCERTAIN) {
        g[status].push({ q, r });
      }
    }
    for (const key of Object.keys(g)) {
      g[key].sort((a, b) => b.r.mistakeCount - a.r.mistakeCount);
    }
    return g;
  }, [state]);

  const practiceable = useMemo(
    () => [...grouped.redAlert, ...grouped[STATUS.WEAK], ...grouped[STATUS.UNCERTAIN]].map((row) => row.q),
    [grouped]
  );
  const queue = useMemo(() => shuffle(practiceable), [sessionKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const totalCount = grouped.redAlert.length + grouped[STATUS.WEAK].length + grouped[STATUS.UNCERTAIN].length;

  if (practicing) {
    const current = queue[index];
    const finished = index >= queue.length;
    return (
      <div>
        <h2 className="section-title">تمرین اشتباهات · Fehler üben</h2>
        {!finished && current && (
          <>
            <p className="text-dim" style={{ fontSize: 12, marginBottom: 8, fontVariantNumeric: "tabular-nums" }}>
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
            <CheckCircleIcon className="empty-icon" />
            <p className="fa">{queue.length === 0 ? "دیگر سؤال ضعیفی نداری!" : "تمرین اشتباهات تمام شد."}</p>
            <button
              type="button"
              className="btn"
              style={{ marginTop: 14 }}
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
      {totalCount === 0 ? (
        <div className="card empty-state">
          <CheckCircleIcon className="empty-icon" />
          <p className="fa">فعلاً هیچ سؤال ضعیف یا RED ALERT‌ای نداری. عالیه!</p>
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
            تمرین همه اشتباهات ({totalCount}) · Alle üben
          </button>

          {GROUPS.map(({ key, label, pillClass, openByDefault }) => {
            const rows = grouped[key];
            return (
              <details key={key} className="card" open={openByDefault && rows.length > 0}>
                <summary className="group-header">
                  <span className={`pill ${pillClass}`}>{rows.length}</span>
                  {label}
                  <ChevronIcon className="chevron" />
                </summary>
                <div className="group-body">
                  {rows.length === 0 && <p className="group-empty">—</p>}
                  {rows.map(({ q, r }) => (
                    <div className="progress-row" key={q.id}>
                      <span className="qid">{q.id}</span>
                      <span className="qtext">{q.question}</span>
                      {key === "redAlert" && <span className="pill red-alert">RED {r.mistakeCount}</span>}
                      {key === STATUS.WEAK && <span className="pill weak">{r.mistakeCount}x</span>}
                      {key === STATUS.UNCERTAIN && (
                        <span className="pill uncertain">
                          {r.correct}✓/{r.attempts}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </>
      )}
    </div>
  );
}
