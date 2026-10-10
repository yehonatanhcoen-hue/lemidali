"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/lib/types";
import { Button, ProgressBar } from "../ui";
import { QuestionView } from "./question-view";

/** Steps through questions; returns { questionId: correct } when finished. */
export function QuizRunner({
  questions,
  onComplete,
  finishLabel = "סיים מבחן",
  sourceOf,
}: {
  questions: QuizQuestion[];
  onComplete: (results: Record<string, boolean>) => void;
  finishLabel?: string;
  sourceOf?: (q: QuizQuestion) => React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const q = questions[index];
  const answered = q && q.id in results;
  const correctCount = Object.values(results).filter(Boolean).length;
  const isLast = index === questions.length - 1;

  if (!q) return null;
  return (
    <div>
      <div className="num mb-2 flex items-center justify-between text-sm text-muted">
        <span>
          שאלה {index + 1} מתוך {questions.length}
        </span>
        <span>{correctCount} נכונות</span>
      </div>
      <ProgressBar percent={((index + (answered ? 1 : 0)) / questions.length) * 100} size="sm" />
      <div className="mt-5">
        <QuestionView
          key={q.id}
          question={q}
          source={sourceOf?.(q)}
          onReveal={(ok) => setResults((r) => ({ ...r, [q.id]: ok }))}
        />
      </div>
      {answered && (
        <div className="mt-5 flex justify-end anim-rise">
          <Button
            onClick={() => (isLast ? onComplete(results) : setIndex(index + 1))}
            data-testid="quiz-next"
          >
            {isLast ? finishLabel : "לשאלה הבאה"}
          </Button>
        </div>
      )}
    </div>
  );
}
