"use client";

import Link from "next/link";
import { useState } from "react";
import { mistakes, questionsOf, quizStats } from "@/lib/progress";
import { scoreOf } from "@/lib/quiz";
import { useCourse } from "@/lib/store";
import type { AttemptResult, CourseData, Quiz } from "@/lib/types";
import { IconCheck, IconQuiz, IconRefresh, IconTarget } from "../icons";
import { Button, ProgressBar, cx, Frac } from "../ui";
import { PracticeFlow } from "./practice";
import { QuizRunner } from "./runner";

type Phase = "intro" | "running" | "result" | "practice";

/** Lesson quiz or topic exam: stats, run, score, retake, practice mistakes. */
export function QuizPanel({
  data,
  quiz,
  emptyHint,
  afterResult,
}: {
  data: CourseData;
  quiz: Quiz | undefined;
  emptyHint?: React.ReactNode;
  /** extra action on the result screen (e.g. "continue to notes") */
  afterResult?: { label: string; onClick: () => void };
}) {
  const { run } = useCourse();
  const [phase, setPhase] = useState<Phase>("intro");
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const questions = questionsOf(data, quiz?.id);
  const stats = quizStats(data, quiz);
  const wrong = quiz ? mistakes(data, quiz.id) : [];

  if (!quiz || questions.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-line px-5 py-8 text-center">
        <IconQuiz size={28} className="mx-auto mb-2 text-muted" />
        <div className="font-medium">אין שאלות כאן עדיין</div>
        <div className="mt-1 text-sm text-muted">
          {emptyHint ?? (
            <>
              אפשר להוסיף שאלות ב
              <Link href="/manage" className="text-accent hover:underline">
                עמוד הניהול
              </Link>{" "}
              או בקובץ הקורס.
            </>
          )}
        </div>
      </div>
    );

  const start = () => {
    setRunKey((k) => k + 1);
    setPhase("running");
  };

  const finish = async (results: Record<string, boolean>) => {
    const r = scoreOf(questions, results, stats.passing);
    setResult(r);
    setPhase("result");
    await run((repo) =>
      repo.recordAttempt(
        quiz.id,
        r,
        questions.map((q) => ({ question_id: q.id, is_correct: Boolean(results[q.id]) })),
      ),
    );
  };

  const statsRow = (
    <div className="num grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3" data-testid="quiz-stats">
      {[
        { label: "ציון עובר", value: `${stats.passing}%` },
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

  const practiceButton = wrong.length > 0 && (
    <Button variant="secondary" onClick={() => setPhase("practice")} data-testid="practice-mistakes">
      <IconTarget size={16} className="text-warn" /> תרגל רק את הטעויות ({wrong.length})
    </Button>
  );

  if (phase === "running")
    return <QuizRunner key={runKey} questions={questions} onComplete={(r) => void finish(r)} />;

  if (phase === "practice")
    return <PracticeFlow questions={wrong} onExit={() => setPhase("intro")} />;

  if (phase === "result" && result)
    return (
      <div className="space-y-5 anim-rise" data-testid="quiz-result" data-passed={result.passed}>
        <div className={cx("rounded-2xl px-6 py-7 text-center", result.passed ? "bg-success-soft" : "bg-surface-2")}>
          <div className="text-sm text-ink-2">הציון שלך</div>
          <div className="num mt-1 text-5xl font-bold tracking-tight anim-pop">
            <Frac a={result.score} b={result.total} />
          </div>
          <div className={cx("num mt-1 text-xl font-semibold", result.passed ? "text-success" : "text-danger")}>
            {result.percent}%
          </div>
          <div className="mx-auto mt-4 max-w-xs">
            <ProgressBar percent={result.percent} tone={result.passed ? "success" : "accent"} />
          </div>
          <div className={cx("mt-4 font-semibold", result.passed ? "text-success" : "text-ink")} data-testid="pass-banner">
            {result.passed ? (
              <span className="inline-flex items-center gap-1.5">
                <IconCheck size={18} strokeWidth={2.6} /> עברת! ההמשך פתוח
              </span>
            ) : (
              <span className="num">לא עברת — צריך {stats.passing}% כדי להתקדם</span>
            )}
          </div>
        </div>
        {statsRow}
        <div className="flex flex-wrap justify-end gap-2">
          {practiceButton}
          <Button variant={result.passed ? "secondary" : "primary"} onClick={start} data-testid="retake">
            <IconRefresh size={16} /> בצע שוב
          </Button>
          {afterResult && result.passed && (
            <Button
              onClick={() => {
                setPhase("intro");
                afterResult.onClick();
              }}
            >
              {afterResult.label}
            </Button>
          )}
        </div>
      </div>
    );

  return (
    <div className="space-y-5">
      {statsRow}
      {stats.count > 0 && (
        <div
          className={cx(
            "rounded-xl px-4 py-3 text-sm font-medium",
            stats.passed ? "bg-success-soft text-success" : "bg-warn-soft text-warn",
          )}
          data-testid="quiz-status"
        >
          {stats.passed ? "עברת את המבחן ✓" : `עדיין לא עברת — הציון הגבוה ${stats.best?.percent ?? 0}%, צריך ${stats.passing}%`}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="num text-sm text-ink-2">
          {questions.length} שאלות · {questions.reduce((s, q) => s + q.points, 0)} נקודות
        </span>
        <div className="flex flex-wrap gap-2">
          {practiceButton}
          <Button onClick={start} data-testid="start-quiz">
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
    </div>
  );
}
