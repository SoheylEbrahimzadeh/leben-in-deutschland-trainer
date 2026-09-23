import { useState } from "react";
import { useProgress } from "../lib/useProgress.js";
import { ALL_QUESTIONS } from "../lib/questions.js";
import { buildMockExam, scoreMockExam, MOCK_EXAM_TOTAL, MOCK_EXAM_GENERAL_COUNT, MOCK_EXAM_HESSEN_COUNT } from "../lib/mockExam.js";
import QuestionCard from "../components/QuestionCard.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import ExamReview from "../components/ExamReview.jsx";
import { ExamIcon, CheckCircleIcon, XCircleIcon } from "../components/Icons.jsx";

export default function MockExam() {
  const { state, submitMockExam } = useProgress();
  // Older persisted exam-history entries (from before the review feature)
  // may not carry a `results` array — only exams that do can be reviewed.
  const lastReviewable = [...state.mockExams].reverse().find((e) => Array.isArray(e.results));
  const [phase, setPhase] = useState("idle"); // idle | running | done | reviewingLast
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
        <div className="card gold-outline">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <ExamIcon width={18} height={18} style={{ color: "var(--gold)" }} />
            <span style={{ fontWeight: 800, fontSize: 15 }}>{MOCK_EXAM_TOTAL} سؤال · Fragen</span>
          </div>
          <p className="fa" style={{ marginTop: 0 }}>
            {MOCK_EXAM_TOTAL} سؤال ({MOCK_EXAM_GENERAL_COUNT} عمومی + {MOCK_EXAM_HESSEN_COUNT} هسن)، دقیقاً مثل آزمون واقعی. در حین
            آزمون هیچ ترجمه، راهنمایی یا پاسخ درستی نمایش داده نمی‌شود.
          </p>
          <button type="button" className="btn" onClick={start}>
            شروع آزمون · Prüfung starten
          </button>
        </div>

        {lastReviewable && (
          <button type="button" className="btn secondary" onClick={() => setPhase("reviewingLast")}>
            مرور آخرین آزمون ({lastReviewable.correct}/{lastReviewable.total}) · Letzte Prüfung ansehen
          </button>
        )}
      </div>
    );
  }

  if (phase === "reviewingLast" && lastReviewable) {
    return (
      <div>
        <h2 className="section-title">مرور آخرین آزمون · Prüfungsrückblick</h2>
        <div className="exam-result-hero">
          <div className={`exam-result-icon ${lastReviewable.correct >= 17 ? "pass" : "fail"}`}>
            {lastReviewable.correct >= 17 ? <CheckCircleIcon /> : <XCircleIcon />}
          </div>
          <div className="exam-result-score">
            {lastReviewable.correct}
            <span className="of"> / {lastReviewable.total}</span>
          </div>
          <p className="text-dim" style={{ marginTop: 4, fontSize: 13 }}>
            {lastReviewable.percentage}٪
          </p>
        </div>
        <ExamReview results={lastReviewable.results} />
        <button type="button" className="btn secondary" onClick={() => setPhase("idle")}>
          بازگشت · Zurück
        </button>
      </div>
    );
  }

  if (phase === "running") {
    const current = examQuestions[index];
    return (
      <div className="exam-shell">
        <div className="exam-header">
          <span>آزمون آزمایشی · Prüfung</span>
          <span className="exam-counter">
            {index + 1} / {examQuestions.length}
          </span>
        </div>
        <ProgressBar value={index} total={examQuestions.length} thin showCount={false} />
        <div style={{ marginTop: 14 }}>
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
      </div>
    );
  }

  // phase === "done"
  const passed = result.correct >= 17; // real exam requires 17/33
  return (
    <div>
      <div className="exam-result-hero">
        <div className={`exam-result-icon ${passed ? "pass" : "fail"}`}>
          {passed ? <CheckCircleIcon /> : <XCircleIcon />}
        </div>
        <div className="exam-result-score">
          {result.correct}
          <span className="of"> / {result.total}</span>
        </div>
        <p className="text-dim" style={{ marginTop: 4, fontSize: 13 }}>
          {result.percentage}٪
        </p>
      </div>

      <div className="card">
        <p className="fa" style={{ marginTop: 0, marginBottom: 0 }}>
          {passed
            ? "حداقل ۱۷ از ۳۳ (آستانه قبولی رسمی) را داری. برای رسیدن به هدف تمرینی ۳۳/۳۳ اپلیکیشن، ادامه بده."
            : "به ۱۷ از ۳۳ (حداقل رسمی برای قبولی) نرسیدی — روی سؤالات اشتباه بیشتر تمرین کن."}
        </p>
      </div>

      {Array.isArray(result.results) && (
        <>
          <h2 className="section-title">مرور آزمون · Prüfungsrückblick</h2>
          <ExamReview key={result.date} results={result.results} />
        </>
      )}

      <button type="button" className="btn secondary" onClick={start}>
        آزمون جدید · Neue Prüfung
      </button>
    </div>
  );
}
