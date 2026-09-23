import { useState } from "react";
import {
  ImageIcon,
  CheckCircleIcon,
  XCircleIcon,
  TranslateIcon,
  AnswerIcon,
  BulbIcon,
  TrapIcon,
  KeyIcon,
} from "./Icons.jsx";

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

  const isCorrect = answered && selected === question.correctAnswer;

  return (
    <div className="card">
      <div className="question-meta">
        <span className="qid-tag">{question.id}</span>
        {question.visual && (
          <span className="qid-tag" title="Bildfrage / سؤال تصویری">
            <ImageIcon width={13} height={13} style={{ verticalAlign: "-2px", marginInlineEnd: 4 }} />
            Bildfrage
          </span>
        )}
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
          cls += " selected";
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
          <div className={`feedback-banner ${isCorrect ? "correct" : "incorrect"}`}>
            {isCorrect ? (
              <>
                <CheckCircleIcon />
                <span className="fa">درست بود! · Richtig</span>
              </>
            ) : (
              <>
                <XCircleIcon />
                <span className="fa">
                  اشتباه بود · Falsch — پاسخ درست: {question.correctAnswer}
                </span>
              </>
            )}
          </div>

          {question.persian && (
            <div className="explain-block">
              <div className="explain-item">
                <div className="explain-label">
                  <TranslateIcon />
                  ترجمه فارسی
                </div>
                <p className="explain-text fa">{question.persian.translation}</p>
              </div>

              <div className="explain-item">
                <div className="explain-label">
                  <AnswerIcon />
                  پاسخ درست
                </div>
                <p className="explain-text fa">{question.persian.correctAnswerPersian}</p>
              </div>

              <div className="explain-item">
                <div className="explain-label">
                  <BulbIcon />
                  توضیح ساده
                </div>
                <p className="explain-text fa">{question.persian.explanation}</p>
              </div>

              <div className="explain-item">
                <div className="explain-label">
                  <BulbIcon />
                  ترفند حفظ کردن
                </div>
                <p className="explain-text fa">{question.persian.memoryTrick}</p>
              </div>

              {question.persian.trap && (
                <div className="explain-item">
                  <div className="explain-label">
                    <TrapIcon />
                    تله رایج
                  </div>
                  <p className="explain-text fa">{question.persian.trap}</p>
                </div>
              )}

              {question.persian.keywords?.length > 0 && (
                <div className="explain-item">
                  <div className="explain-label">
                    <KeyIcon />
                    کلیدواژه‌ها
                  </div>
                  <div className="keyword-row">
                    {question.persian.keywords.map((k) => (
                      <span className="keyword-chip" key={k}>
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button type="button" className="btn" style={{ marginTop: 18 }} onClick={onNext}>
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
