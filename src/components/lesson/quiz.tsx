"use client";

import Link from "next/link";
import { useState } from "react";
import { quizStats } from "@/lib/progress";
import { useCourse } from "@/lib/store";
import type { CourseData, QuizQuestion } from "@/lib/types";
import { IconCheck, IconQuiz, IconRefresh, IconX } from "../icons";
import { Button, ProgressBar, cx } from "../ui";

const LETTERS = ["א", "ב", "ג", "ד", "ה", "ו"];

type Phase = { kind: "intro" } | { kind: "running"; index: number; picked: string | null; correct: number } | { kind: "done"; score: number };

export function QuizSection({ data, lessonId, questions }: { data: CourseData; lessonId: string; questions: QuizQuestion[] }) {
  const { actions } = useCourse();
  const stats = quizStats(data, lessonId);
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });

  if (questions.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-line px-5 py-8 text-center">
        <IconQuiz size={28} className="mx-auto mb-2 text-muted" />
        <div className="font-medium">עדיין אין שאלות לשיעור הזה</div>
        <div className="mt-1 text-sm text-muted">
          אפשר להוסיף שאלות ב
          <Link href="/manage" className="text-accent hover:underline">
            עמוד הניהול
          </Link>
          . השלב הזה לא חוסם את המשך השיעור.
        </div>
      </div>
    );

  const total = questions.length;

  const statsRow = (
    <div className="num grid grid-cols-3 gap-2 sm:gap-3" data-testid="quiz-stats">
      {[
        { label: "ניסיונות", value: String(stats.count) },
        { label: "ציון אחרון", value: stats.last ? `${stats.last.percent}%` : "—" },
        { label: "ציון גבוה", value: stats.best ? `${stats.best.percent}%` : "—" },
      ].map((s) => (
        <div key={s.label} className="rounded-xl bg-surface-2 px-3 py-3 text-center">
          <div className="text-xl font-bold">{s.value}</div>
          <div className="text-xs text-muted">{s.label}</div>
        </div>
      ))}
    </div>
  );

  if (phase.kind === "intro")
    return (
      <div className="space-y-5">
        {statsRow}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="num text-sm text-ink-2">{total} שאלות · בחירה מרובה</span>
          <Button onClick={() => setPhase({ kind: "running", index: 0, picked: null, correct: 0 })} data-testid="start-quiz">
            {stats.count ? (
              <>
                <IconRefresh size={16} /> בצע שוב
              </>
            ) : (
              "התחל מבחן"
            )}
          </Button>
        </div>
      </div>
    );

  if (phase.kind === "done") {
    const pct = Math.round((phase.score / total) * 100);
    return (
      <div className="space-y-5 anim-rise" data-testid="quiz-result">
        <div className="rounded-2xl bg-surface-2 px-6 py-7 text-center">
          <div className="text-sm text-ink-2">הציון שלך</div>
          <div className="num mt-1 text-5xl font-bold tracking-tight anim-pop">
            {phase.score} / {total}
          </div>
          <div className={cx("num mt-1 text-xl font-semibold", pct >= 80 ? "text-success" : pct >= 50 ? "text-warn" : "text-danger")}>
            {pct}%
          </div>
          <div className="mx-auto mt-4 max-w-xs">
            <ProgressBar percent={pct} tone={pct >= 80 ? "success" : "accent"} />
          </div>
        </div>
        {statsRow}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setPhase({ kind: "running", index: 0, picked: null, correct: 0 })}>
            <IconRefresh size={16} /> נסה שוב
          </Button>
          <Button
            onClick={() => {
              setPhase({ kind: "intro" });
              document.getElementById("notes")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            המשך לסיכום
          </Button>
        </div>
      </div>
    );
  }

  const q = questions[phase.index];
  const picked = phase.picked;
  const pickedAnswer = q.answers.find((a) => a.id === picked);
  const isLast = phase.index === total - 1;

  const pick = (answerId: string) => {
    if (picked) return;
    const right = q.answers.find((a) => a.id === answerId)?.is_correct ?? false;
    setPhase({ ...phase, picked: answerId, correct: phase.correct + (right ? 1 : 0) });
  };

  const next = async () => {
    if (!isLast) return setPhase({ kind: "running", index: phase.index + 1, picked: null, correct: phase.correct });
    setPhase({ kind: "done", score: phase.correct });
    await actions.addQuizAttempt(lessonId, phase.correct, total);
  };

  return (
    <div key={q.id} className="anim-rise" data-testid="quiz-question">
      <div className="num mb-2 flex items-center justify-between text-sm text-muted">
        <span>
          שאלה {phase.index + 1} מתוך {total}
        </span>
        <span>{phase.correct} נכונות</span>
      </div>
      <ProgressBar percent={((phase.index + (picked ? 1 : 0)) / total) * 100} size="sm" />
      <h3 className="mt-5 mb-4 text-lg font-semibold">{q.question}</h3>
      <div className="grid gap-2.5">
        {q.answers.map((a, i) => {
          const isPicked = a.id === picked;
          const reveal = picked !== null;
          const state = !reveal ? "idle" : a.is_correct ? "correct" : isPicked ? "wrong" : "dim";
          return (
            <button
              key={a.id}
              onClick={() => pick(a.id)}
              disabled={reveal}
              data-testid="quiz-answer"
              data-state={state}
              className={cx(
                "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-start transition",
                state === "idle" && "border-line hover:border-accent/60 hover:bg-accent-soft/50 active:scale-[0.99]",
                state === "correct" && "border-success bg-success-soft",
                state === "wrong" && "border-danger bg-danger-soft anim-shake",
                state === "dim" && "border-line opacity-50",
              )}
            >
              <span
                className={cx(
                  "grid size-8 shrink-0 place-items-center rounded-lg text-sm font-semibold transition",
                  state === "correct" ? "bg-success text-white" : state === "wrong" ? "bg-danger text-white" : "bg-surface-2 text-ink-2",
                )}
              >
                {state === "correct" ? (
                  <IconCheck size={16} strokeWidth={2.6} className="anim-pop" />
                ) : state === "wrong" ? (
                  <IconX size={16} strokeWidth={2.6} />
                ) : (
                  LETTERS[i]
                )}
              </span>
              <span className="ut font-medium">{a.answer}</span>
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 anim-rise">
          <div
            className={cx("font-semibold", pickedAnswer?.is_correct ? "text-success" : "text-danger")}
            data-testid="quiz-feedback"
          >
            {pickedAnswer?.is_correct ? "תשובה נכונה!" : "לא נכון — התשובה הנכונה מסומנת בירוק"}
          </div>
          <Button onClick={next} data-testid="quiz-next">
            {isLast ? "סיים מבחן" : "לשאלה הבאה"}
          </Button>
        </div>
      )}
    </div>
  );
}
