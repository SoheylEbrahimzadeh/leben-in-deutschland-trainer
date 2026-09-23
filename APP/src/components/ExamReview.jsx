import { useMemo, useState } from "react";
import { getQuestionById } from "../lib/questions.js";
import { filterExamResults } from "../lib/mockExam.js";
import QuestionCard from "./QuestionCard.jsx";
import { CheckCircleIcon, XCircleIcon, ChevronIcon } from "./Icons.jsx";

/**
 * Replays a completed mock exam question-by-question. Consumes the exact
 * `results` array produced by scoreMockExam() for THIS exam — it never
 * rebuilds or re-randomizes anything; each row just looks up the already-
 * answered question by id (via getQuestionById) and renders it through the
 * same QuestionCard used in Train mode, so the German question, the original
 * A/B/C/D options, the Persian translation/explanation/memory trick/trap/
 * keywords, and the correct-answer highlighting are all identical to what
 * the learner already saw elsewhere in the app — nothing here invents new
 * teaching content.
 *
 * Rows are native <details>/<summary> accordions: any number can be open at
 * once (never forced all-open), and each stays independently expandable.
 */
export default function ExamReview({ results }) {
  const [filter, setFilter] = useState("all"); // "all" | "wrong"

  // Keep each row's position tied to its real place in the actual completed
  // exam (1..33) even when the "only wrong" filter narrows what's shown.
  const numbered = useMemo(() => results.map((r, i) => ({ ...r, position: i + 1 })), [results]);
  const visible = useMemo(() => filterExamResults(numbered, filter), [numbered, filter]);
  const wrongCount = useMemo(() => numbered.filter((r) => !r.isCorrect).length, [numbered]);

  return (
    <div className="exam-review">
      <div className="exam-review-filter">
        <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
          همه ({numbered.length}) · Alle
        </button>
        <button type="button" className={filter === "wrong" ? "active" : ""} onClick={() => setFilter("wrong")}>
          فقط اشتباه ({wrongCount}) · Nur falsch
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="card empty-state">
          <CheckCircleIcon className="empty-icon" />
          <p className="fa">هیچ سؤال اشتباهی در این آزمون نبود!</p>
        </div>
      ) : (
        visible.map((r) => {
          const question = getQuestionById(r.id);
          if (!question) return null;
          return (
            <details key={r.id} className="card exam-review-row">
              <summary className="group-header">
                {r.isCorrect ? (
                  <CheckCircleIcon className="review-status correct" />
                ) : (
                  <XCircleIcon className="review-status incorrect" />
                )}
                <span className="review-label fa">سؤال {r.position}</span>
                <span className="review-qid">{r.id}</span>
                <ChevronIcon className="chevron" />
              </summary>
              <div className="group-body">
                <QuestionCard
                  key={`${r.id}-${filter}`}
                  question={question}
                  examMode={false}
                  initialSelected={r.selected}
                  hideNext
                />
              </div>
            </details>
          );
        })
      )}
    </div>
  );
}
