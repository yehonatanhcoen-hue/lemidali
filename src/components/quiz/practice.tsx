"use client";

import { useState } from "react";
import { useCourse } from "@/lib/store";
import type { QuizQuestion } from "@/lib/types";
import { IconCheck, IconRefresh, IconTarget } from "../icons";
import { Button } from "../ui";
import { QuizRunner } from "./runner";

/**
 * Mistakes practice: runs the given questions; whatever is still wrong can be
 * retried in another round until everything is fixed. Answers update "my mistakes".
 */
export function PracticeFlow({
  questions,
  onExit,
  sourceOf,
}: {
  questions: QuizQuestion[];
  onExit: () => void;
  sourceOf?: (q: QuizQuestion) => React.ReactNode;
}) {
  const { run } = useCourse();
  const [round, setRound] = useState({ n: 1, items: questions });
  const [done, setDone] = useState<{ fixed: number; left: QuizQuestion[] } | null>(null);

  const finish = async (results: Record<string, boolean>) => {
    const left = round.items.filter((q) => !results[q.id]);
    setDone({ fixed: round.items.length - left.length, left });
    await run((r) => r.logAnswers(round.items.map((q) => ({ question_id: q.id, is_correct: Boolean(results[q.id]) }))));
  };

  if (done)
    return (
      <div className="space-y-5 text-center anim-rise" data-testid="practice-result">
        <span className={`mx-auto grid size-14 place-items-center rounded-full ${done.left.length ? "bg-warn-soft text-warn" : "bg-success text-white anim-pop"}`}>
          {done.left.length ? <IconTarget size={26} /> : <IconCheck size={28} strokeWidth={2.6} />}
        </span>
        <div>
          <div className="text-xl font-bold">{done.left.length ? `תוקנו ${done.fixed} מתוך ${round.items.length}` : "כל הטעויות תוקנו!"}</div>
          {done.left.length > 0 && <div className="num mt-1 text-sm text-ink-2">נשארו {done.left.length} שאלות לחזור עליהן</div>}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {done.left.length > 0 && (
            <Button
              onClick={() => {
                setRound({ n: round.n + 1, items: done.left });
                setDone(null);
              }}
              data-testid="practice-again"
            >
              <IconRefresh size={16} /> סבב נוסף ({done.left.length})
            </Button>
          )}
          <Button variant="secondary" onClick={onExit}>
            סיום
          </Button>
        </div>
      </div>
    );

  return (
    <div data-testid="practice-flow">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-warn">
        <IconTarget size={17} /> תרגול טעויות{round.n > 1 && <span className="num"> · סבב {round.n}</span>}
      </div>
      <QuizRunner key={round.n} questions={round.items} onComplete={finish} finishLabel="סיים סבב" sourceOf={sourceOf} />
    </div>
  );
}
