"use client";

import { useState } from "react";
import { QUESTION_TYPE_LABEL, isCorrect, type Response } from "@/lib/quiz";
import type { QuizQuestion } from "@/lib/types";
import { IconCheck, IconX } from "../icons";
import { Button, cx } from "../ui";

const LETTERS = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח"];

/**
 * One question, all four types. Calls onReveal(correct) once the answer is
 * checked; the parent then shows its "next" button.
 */
export function QuestionView({
  question: q,
  onReveal,
  source,
}: {
  question: QuizQuestion;
  onReveal: (correct: boolean) => void;
  source?: React.ReactNode;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [openText, setOpenText] = useState("");
  const [showModel, setShowModel] = useState(false);
  const [revealed, setRevealed] = useState<boolean | null>(null); // correct?

  const reveal = (r: Response) => {
    const ok = isCorrect(q, r);
    setRevealed(ok);
    onReveal(ok);
  };

  const pickOne = (id: string) => {
    if (revealed !== null) return;
    setSelected([id]);
    reveal({ kind: "options", selected: [id] });
  };

  const toggle = (id: string) => {
    if (revealed !== null) return;
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const isMulti = q.type === "multiple";
  const done = revealed !== null;

  return (
    <div className="anim-rise" data-testid="quiz-question" data-type={q.type}>
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="rounded-full bg-surface-2 px-2 py-0.5">{QUESTION_TYPE_LABEL[q.type]}</span>
        {q.points > 1 && <span className="num">{q.points} נקודות</span>}
        {source}
      </div>
      <h3 className="mt-2 mb-4 text-lg font-semibold whitespace-pre-line">{q.question}</h3>
      {isMulti && !done && <p className="-mt-2 mb-3 text-sm text-muted">סמן את כל התשובות הנכונות</p>}

      {q.type === "open" ? (
        <div className="space-y-3">
          <textarea
            value={openText}
            onChange={(e) => setOpenText(e.target.value)}
            disabled={showModel}
            rows={4}
            placeholder="כתוב את התשובה שלך…"
            className="block w-full rounded-xl border border-line bg-surface p-3.5 leading-relaxed outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-80"
            data-testid="open-answer"
          />
          {!showModel ? (
            <Button variant="secondary" onClick={() => setShowModel(true)} data-testid="show-model">
              הצג תשובה לדוגמה
            </Button>
          ) : (
            <div className="space-y-3 anim-rise">
              <div className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3">
                <div className="mb-1 text-xs font-semibold text-accent">תשובה לדוגמה</div>
                <div className="ut whitespace-pre-line text-ink">{q.model_answer}</div>
              </div>
              {!done && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-ink-2">איך הלך?</span>
                  <Button variant="success" size="sm" onClick={() => reveal({ kind: "open", text: openText, selfCorrect: true })} data-testid="self-correct">
                    <IconCheck size={15} /> צדקתי
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => reveal({ kind: "open", text: openText, selfCorrect: false })} data-testid="self-wrong">
                    <IconX size={15} /> טעיתי
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-2.5">
          {q.options.map((o, i) => {
            const chosen = selected.includes(o.id);
            const state = !done
              ? chosen
                ? "chosen"
                : "idle"
              : o.is_correct
                ? chosen || !isMulti
                  ? "correct"
                  : "missed"
                : chosen
                  ? "wrong"
                  : "dim";
            return (
              <button
                key={o.id}
                onClick={() => (isMulti ? toggle(o.id) : pickOne(o.id))}
                disabled={done}
                data-testid="quiz-answer"
                data-state={state}
                aria-pressed={isMulti ? chosen : undefined}
                className={cx(
                  "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-start transition",
                  state === "idle" && "border-line hover:border-accent/60 hover:bg-accent-soft/50 active:scale-[0.99]",
                  state === "chosen" && "border-accent bg-accent-soft",
                  state === "correct" && "border-success bg-success-soft",
                  state === "missed" && "border-success border-dashed",
                  state === "wrong" && "border-danger bg-danger-soft anim-shake",
                  state === "dim" && "border-line opacity-50",
                )}
              >
                <span
                  className={cx(
                    "grid size-8 shrink-0 place-items-center text-sm font-semibold transition",
                    isMulti ? "rounded-md" : "rounded-lg",
                    state === "correct" || state === "missed"
                      ? "bg-success text-white"
                      : state === "wrong"
                        ? "bg-danger text-white"
                        : state === "chosen"
                          ? "bg-accent text-accent-ink"
                          : "bg-surface-2 text-ink-2",
                  )}
                >
                  {state === "correct" || state === "missed" ? (
                    <IconCheck size={16} strokeWidth={2.6} className="anim-pop" />
                  ) : state === "wrong" ? (
                    <IconX size={16} strokeWidth={2.6} />
                  ) : isMulti && chosen ? (
                    <IconCheck size={16} strokeWidth={2.6} />
                  ) : q.type === "true_false" ? (
                    i === 0 ? "✓" : "✗"
                  ) : (
                    LETTERS[i]
                  )}
                </span>
                <span className="ut font-medium">{o.text}</span>
              </button>
            );
          })}
          {isMulti && !done && (
            <div>
              <Button onClick={() => reveal({ kind: "options", selected })} disabled={!selected.length} data-testid="check-answer">
                בדוק תשובה
              </Button>
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="mt-4 space-y-3 anim-rise">
          <div className={cx("font-semibold", revealed ? "text-success" : "text-danger")} data-testid="quiz-feedback">
            {revealed
              ? "תשובה נכונה!"
              : q.type === "open"
                ? "סומן כטעות — השאלה תחזור בתרגול הטעויות"
                : isMulti
                  ? "לא מדויק — התשובות הנכונות מסומנות בירוק"
                  : "לא נכון — התשובה הנכונה מסומנת בירוק"}
          </div>
          {q.explanation && (
            <div className="rounded-xl bg-surface-2 px-4 py-3 text-sm leading-relaxed" data-testid="explanation">
              <span className="font-semibold">הסבר: </span>
              <span className="ut whitespace-pre-line">{q.explanation}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
