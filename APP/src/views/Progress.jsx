import { useMemo, useState } from "react";
import { useProgress } from "../lib/useProgress.js";
import { ALL_QUESTIONS, TOTAL_COUNT } from "../lib/questions.js";
import { computeStatus, isRedAlert, STATUS } from "../lib/progressStore.js";
import { ChevronIcon } from "../components/Icons.jsx";

const GROUPS = [
  { key: "redAlert", label: "RED ALERT", pillClass: "red-alert" },
  { key: STATUS.WEAK, label: "ضعیف · Schwach", pillClass: "weak" },
  { key: STATUS.UNCERTAIN, label: "نامطمئن · Unsicher", pillClass: "uncertain" },
  { key: STATUS.MASTERED, label: "مسلط · Gemeistert", pillClass: "mastered" },
  { key: STATUS.UNPRACTICED, label: "تمرین‌نشده · Ungeübt", pillClass: "unpracticed" },
];

export default function Progress() {
  const { state, resetAll } = useProgress();
  const [confirmingReset, setConfirmingReset] = useState(false);

  const grouped = useMemo(() => {
    const g = { redAlert: [], [STATUS.WEAK]: [], [STATUS.UNCERTAIN]: [], [STATUS.MASTERED]: [], [STATUS.UNPRACTICED]: [] };
    for (const q of ALL_QUESTIONS) {
      const r = state.perQuestion[q.id];
      if (isRedAlert(r)) {
        g.redAlert.push({ q, r });
        continue;
      }
      const status = computeStatus(r);
      g[status].push({ q, r });
    }
    return g;
  }, [state]);

  return (
    <div>
      <h2 className="section-title">پیشرفت کامل · Voller Fortschritt ({TOTAL_COUNT})</h2>

      {GROUPS.map(({ key, label, pillClass }) => {
        const rows = grouped[key];
        return (
          <details key={key} className="card" open={key === "redAlert" && rows.length > 0}>
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
                  <span className="text-dim" style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                    {r ? `${r.correct}✓/${r.wrong}✗` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </details>
        );
      })}

      <h2 className="section-title">بازنشانی · Zurücksetzen</h2>
      <div className="card">
        {!confirmingReset ? (
          <button type="button" className="btn secondary" onClick={() => setConfirmingReset(true)}>
            پاک کردن کل پیشرفت · Fortschritt löschen
          </button>
        ) : (
          <>
            <p className="fa" style={{ marginTop: 0 }}>
              مطمئنی؟ این کار همه پیشرفت ذخیره‌شده روی این دستگاه را برای همیشه پاک می‌کند.
            </p>
            <button
              type="button"
              className="btn danger"
              style={{ marginBottom: 10 }}
              onClick={() => {
                resetAll();
                setConfirmingReset(false);
              }}
            >
              بله، پاک کن · Ja, löschen
            </button>
            <button type="button" className="btn secondary" onClick={() => setConfirmingReset(false)}>
              انصراف · Abbrechen
            </button>
          </>
        )}
      </div>
    </div>
  );
}
