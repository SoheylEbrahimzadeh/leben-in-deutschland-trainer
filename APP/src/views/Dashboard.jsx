import { useMemo } from "react";
import { useProgress } from "../lib/useProgress.js";
import { ALL_QUESTIONS, GENERAL_QUESTIONS, HESSEN_QUESTIONS, TOTAL_COUNT } from "../lib/questions.js";
import { bucketCounts } from "../lib/adaptiveQueue.js";

function recommend(buckets, hessenBuckets, mockExams) {
  if (buckets.redAlert > 0) {
    return { label: "تمرین اصلاحی · Fehler-Training (RED ALERT)", view: "train" };
  }
  if (buckets.weak > 0) {
    return { label: "تمرین سؤالات ضعیف · Schwache Fragen üben", view: "train" };
  }
  if (buckets.unpracticed > 0) {
    return { label: "ادامه یادگیری سؤالات جدید · Neue Fragen lernen", view: "train" };
  }
  if (hessenBuckets.redAlert + hessenBuckets.weak + hessenBuckets.unpracticed > 0) {
    return { label: "تمرین سؤالات هسن · Hessen-Fragen üben", view: "hessen" };
  }
  const lastMock = mockExams[mockExams.length - 1];
  if (!lastMock || lastMock.correct < lastMock.total) {
    return { label: "آزمون آزمایشی · Prüfungssimulation starten", view: "mock" };
  }
  return { label: "مرور دوره‌ای · Wiederholung", view: "train" };
}

export default function Dashboard({ navigate }) {
  const { state } = useProgress();

  const { studied, mastered, weak, totalMistakes, redAlert, generalBuckets, hessenBuckets, latestMock, bestMock } =
    useMemo(() => {
      const perQ = state.perQuestion;
      let studied = 0;
      let mastered = 0;
      let weak = 0;
      let totalMistakes = 0;
      let redAlert = 0;
      for (const q of ALL_QUESTIONS) {
        const r = perQ[q.id];
        if (!r || r.attempts === 0) continue;
        studied += 1;
        totalMistakes += r.mistakeCount;
        if (r.mistakeCount >= 3) redAlert += 1;
      }
      const generalBuckets = bucketCounts(GENERAL_QUESTIONS, perQ);
      const hessenBuckets = bucketCounts(HESSEN_QUESTIONS, perQ);
      mastered = generalBuckets.mastered + hessenBuckets.mastered;
      weak = generalBuckets.weak + hessenBuckets.weak;

      const mocks = state.mockExams;
      const latestMock = mocks.length ? mocks[mocks.length - 1] : null;
      const bestMock = mocks.length
        ? mocks.reduce((best, m) => (m.percentage > best.percentage ? m : best), mocks[0])
        : null;

      return { studied, mastered, weak, totalMistakes, redAlert, generalBuckets, hessenBuckets, latestMock, bestMock };
    }, [state]);

  const rec = recommend(generalBuckets, hessenBuckets, state.mockExams);
  const hessenAttempted = HESSEN_QUESTIONS.filter((q) => (state.perQuestion[q.id]?.attempts ?? 0) > 0).length;

  return (
    <div>
      <h2 className="section-title">پیشرفت کلی · Fortschritt ({TOTAL_COUNT} Fragen)</h2>
      <div className="stat-grid">
        <div className="stat-box">
          <div className="value">{studied}</div>
          <div className="label">تمرین‌شده · Geübt</div>
        </div>
        <div className="stat-box good">
          <div className="value">{mastered}</div>
          <div className="label">مسلط · Gemeistert</div>
        </div>
        <div className="stat-box">
          <div className="value">{weak}</div>
          <div className="label">ضعیف · Schwach</div>
        </div>
        <div className="stat-box alert">
          <div className="value">{redAlert}</div>
          <div className="label">RED ALERT (≥3 خطا)</div>
        </div>
        <div className="stat-box">
          <div className="value">{totalMistakes}</div>
          <div className="label">مجموع خطاها · Fehler gesamt</div>
        </div>
        <div className="stat-box">
          <div className="value">{hessenAttempted}/10</div>
          <div className="label">هسن · Hessen</div>
        </div>
      </div>

      <h2 className="section-title">آزمون آزمایشی · Prüfungssimulation</h2>
      <div className="stat-grid">
        <div className="stat-box">
          <div className="value">{latestMock ? `${latestMock.correct}/${latestMock.total}` : "—"}</div>
          <div className="label">آخرین نتیجه · Letztes Ergebnis</div>
        </div>
        <div className="stat-box good">
          <div className="value">{bestMock ? `${bestMock.correct}/${bestMock.total}` : "—"}</div>
          <div className="label">بهترین نتیجه · Bestes Ergebnis</div>
        </div>
      </div>

      <h2 className="section-title">قدم بعدی · Nächster Schritt</h2>
      <div className="card">
        <p className="fa" style={{ margin: "0 0 14px", fontSize: 15 }}>
          پیشنهاد می‌شود الان این کار را انجام بدهی:
        </p>
        <button type="button" className="btn" onClick={() => navigate(rec.view)}>
          {rec.label}
        </button>
      </div>
    </div>
  );
}
