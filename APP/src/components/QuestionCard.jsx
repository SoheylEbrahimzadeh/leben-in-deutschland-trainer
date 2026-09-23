import { useState } from "react";

const LETTERS = ["A", "B", "C", "D"];

/**
 * Renders one question. In practice mode (examMode=false) the German
 * question and original A/B/C/D options are shown first; only after the
 * user picks an option does it reveal correct/incorrect, the Persian
 * translation, explanation, memory trick, trap and keywords. In exam mode
 * no hint, translation or reveal is ever shown — a selection is just
 * recorded and the learner moves on with "Next".
 *
 * Remount this component with `key={question.id}` when the question
 * changes, so its internal "have I answered yet" state resets naturally.
 */
export default function QuestionCard({
  question,
  examMode = false,
  onAnswer, // (letter) => void — called once, when the user first picks an option
  onNext, // () => void — called when the learner is ready to move on
  nextLabel = "بعدی · Weiter",
  initialSelected = null,
}) {
  const [selected, setSelected] = useState(initialSelected);
  const answered = selected !== null;

  function pick(letter) {
    if (examMode) {
      setSelected(letter); // exam: selection can be changed until "Next"
      onAnswer?.(letter);
      return;
    }
    if (answered) return; // practice: locked in after first pick
    setSelected(letter);
    onAnswer?.(letter);
  }

  return (
    <div className="card">
      <div className="question-meta">
        <span>{question.id}</span>
        {question.visual && <span title="Bildfrage / سؤال تصویری">🖼️ Bildfrage</span>}
      </div>
      <div className="question-text">{question.question}</div>

      {LETTERS.map((letter) => {
        const isSelected = selected === letter;
        const isCorrectLetter = letter === question.correctAnswer;
        let cls = "option-btn";
        if (!examMode && answered) {
          if (isCorrectLetter) cls += " correct";
          else if (isSelected) cls += " incorrect";
        } else if (examMode && isSelected) {
          cls += " correct"; // reuse the accent styling as a neutral "selected" look
        }
        return (
          <button
            key={letter}
            type="button"
            className={cls}
            disabled={!examMode && answered}
            onClick={() => pick(letter)}
          >
            <span className="letter">{letter}</span>
            <span>{question.options[letter]}</span>
          </button>
        );
      })}

      {!examMode && answered && (
        <>
          <div className={`feedback-banner ${selected === question.correctAnswer ? "correct" : "incorrect"}`}>
            {selected === question.correctAnswer
              ? "درست بود! ✓ Richtig!"
              : `اشتباه بود ✗ Falsch — richtig: ${question.correctAnswer}`}
          </div>

          {question.persian && (
            <div className="explain-block">
              <div className="explain-label">ترجمه فارسی</div>
              <p className="explain-text fa">{question.persian.translation}</p>

              <div className="explain-label">پاسخ درست</div>
              <p className="explain-text fa">{question.persian.correctAnswerPersian}</p>

              <div className="explain-label">توضیح ساده</div>
              <p className="explain-text fa">{question.persian.explanation}</p>

              <div className="explain-label">ترفند حفظ کردن</div>
              <p className="explain-text fa">{question.persian.memoryTrick}</p>

              {question.persian.trap && (
                <>
                  <div className="explain-label">تله رایج</div>
                  <p className="explain-text fa">{question.persian.trap}</p>
                </>
              )}

              {question.persian.keywords?.length > 0 && (
                <div>
                  {question.persian.keywords.map((k) => (
                    <span className="keyword-chip" key={k}>
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <button type="button" className="btn" style={{ marginTop: 6 }} onClick={onNext}>
            {nextLabel}
          </button>
        </>
      )}

      {examMode && (
        <button type="button" className="btn" style={{ marginTop: 6 }} disabled={!answered} onClick={onNext}>
          {nextLabel}
        </button>
      )}
    </div>
  );
}
