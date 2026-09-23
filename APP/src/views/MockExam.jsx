import { useState } from "react";
import { useProgress } from "../lib/useProgress.js";
import { ALL_QUESTIONS, getQuestionById } from "../lib/questions.js";
import { buildMockExam, scoreMockExam, MOCK_EXAM_TOTAL, MOCK_EXAM_GENERAL_COUNT, MOCK_EXAM_HESSEN_COUNT } from "../lib/mockExam.js";
import QuestionCard from "../components/QuestionCard.jsx";

export default function MockExam() {
  const { submitMockExam } = useProgress();
  const [phase, setPhase] = useState("idle"); // idle | running | done
  const [examQuestions, setExamQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState(null);

  function start() {
    const qs = buildMockExam(ALL_QUESTIONS);
    setExamQuestions(qs);
    setAnswers({});
    setIndex(0);
    setResult(null);
    setPhase("running");
  }

  function handleAnswer(letter) {
    const q = examQuestions[index];
    setAnswers((prev) => ({ ...prev, [q.id]: letter }));
  }

  function handleNext() {
    if (index + 1 < examQuestions.length) {
      setIndex((i) => i + 1);
    } else {
      const scored = scoreMockExam(examQuestions, answers);
      submitMockExam(scored);
      setResult(scored);
      setPhase("done");
    }
  }

  if (phase === "idle") {
    return (
      <div>
        <h2 className="section-title">آزمون آزمایشی · Prüfungssimulation</h2>
        <div className="card">
          <p className="fa" style={{ marginTop: 0 }}>
            {MOCK_EXAM_TOTAL} سؤال ({MOCK_EXAM_GENERAL_COUNT} عمومی + {MOCK_EXAM_HESSEN_COUNT} هسن)، دقیقاً مثل آزمون واقعی. در حین
            آزمون هیچ ترجمه، راهنمایی یا پاسخ درستی نمایش داده نمی‌شود.
          </p>
          <button type="button" className="btn" onClick={start}>
            شروع آزمون · Prüfung starten
          </button>
        </div>
      </div>
    );
  }

  if (phase === "running") {
    const current = examQuestions[index];
    const pct = Math.round((index / examQuestions.length) * 100);
    return (
      <div>
        <p style={{ color: "var(--text-dim)", fontSize: 12, marginBottom: 6 }}>
          سؤال {index + 1} / {examQuestions.length}
        </p>
        <div className="exam-progress-bar">
          <div className="fill" style={{ width: `${pct}%` }} />
        </div>
        <QuestionCard
          key={current.id}
          question={current}
          examMode
          initialSelected={answers[current.id] ?? null}
          onAnswer={handleAnswer}
          onNext={handleNext}
          nextLabel={index + 1 < examQuestions.length ? "بعدی · Weiter" : "پایان و نتیجه · Abschließen"}
        />
      </div>
    );
  }

  // phase === "done"
  const passed = result.correct >= 17; // real exam requires 17/33
  return (
    <div>
      <h2 className="section-title">نتیجه آزمون · Ergebnis</h2>
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className={`stat-box ${passed ? "good" : "alert"}`}>
          <div className="value">
            {result.correct}/{result.total}
          </div>
          <div className="label">درست · Richtig</div>
        </div>
        <div className="stat-box">
          <div className="value">{result.percentage}%</div>
          <div className="label">درصد</div>
        </div>
      </div>
      <div className="card">
        <p className="fa" style={{ marginTop: 0 }}>
          {passed
            ? "حداقل ۱۷ از ۳۳ (آستانه قبولی رسمی) را داری. برای رسیدن به هدف تمرینی ۳۳/۳۳ اپلیکیشن، ادامه بده."
            : "به ۱۷ از ۳۳ (حداقل رسمی برای قبولی) نرسیدی — روی سؤالات اشتباه بیشتر تمرین کن."}
        </p>
      </div>

      {result.mistakes.length > 0 && (
        <>
          <h2 className="section-title">سؤالات اشتباه · Fehler ({result.mistakes.length})</h2>
          <div className="card">
            {result.mistakes.map((m) => {
              const q = getQuestionById(m.id);
              return (
                <div className="progress-row" key={m.id}>
                  <span className="qid">{m.id}</span>
                  <span className="qtext">{q?.question}</span>
                  <span className="pill weak">
                    {m.selected ?? "—"}→{m.correct}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <button type="button" className="btn secondary" onClick={start}>
        آزمون جدید · Neue Prüfung
      </button>
    </div>
  );
}
