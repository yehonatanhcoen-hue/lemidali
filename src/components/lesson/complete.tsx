"use client";

import Link from "next/link";
import { useState } from "react";
import { STEPS, type SeqItem, type StepKey, gateOf, itemHref, itemTitle, lessonQuiz, quizStats, topicProgress } from "@/lib/progress";
import { useCourse } from "@/lib/store";
import type { CourseData, Lesson } from "@/lib/types";
import { IconCheck, IconFlag, IconLock } from "../icons";
import { Button, ProgressBar, cx, Frac } from "../ui";
import { routes } from "@/lib/routes";

export function CompleteSection({
  data,
  lesson,
  steps,
  next,
}: {
  data: CourseData;
  lesson: Lesson;
  steps: Record<StepKey, boolean>;
  next: SeqItem | null;
}) {
  const { run } = useCourse();
  const [busy, setBusy] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const completed = steps.complete;
  const tp = topicProgress(data, lesson.topic_id);
  const qs = quizStats(data, lessonQuiz(data, lesson.id));
  const blocksNext = data.course.lock_until_passed && !qs.passed;
  const nextLocked = next ? gateOf(data, next.id).locked : false;

  const setStatus = async (done: boolean) => {
    setBusy(true);
    await run((repo) =>
      repo.upsertProgress(lesson.id, done ? { status: "completed", completed_at: new Date().toISOString() } : { status: "in_progress", completed_at: null }),
    );
    setJustCompleted(done);
    setBusy(false);
  };

  const passNote = blocksNext && (
    <div className="num flex items-center gap-2 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn" data-testid="pass-required">
      <IconLock size={16} className="shrink-0" />
      ההמשך ייפתח רק אחרי מעבר המבחן בציון {qs.passing}% לפחות.
    </div>
  );

  if (completed)
    return (
      <div className="space-y-5 text-center" data-testid="lesson-completed">
        <span className={cx("mx-auto grid size-16 place-items-center rounded-full bg-success text-success-ink", justCompleted && "anim-pop anim-ring")}>
          <IconCheck size={32} strokeWidth={2.6} />
        </span>
        <div className="text-xl font-bold">{justCompleted ? "כל הכבוד! השיעור הושלם" : "השיעור הושלם"}</div>
        <div className="mx-auto max-w-sm">
          <div className="num mb-1.5 flex justify-between text-sm text-ink-2">
            <span>התקדמות בנושא</span>
            <span className="font-semibold text-ink">
              <Frac a={tp.completed} b={tp.total} /> · {tp.percent}%
            </span>
          </div>
          <ProgressBar percent={tp.percent} />
        </div>
        {passNote}
        <div className="flex flex-wrap justify-center gap-2">
          {next ? (
            nextLocked ? (
              <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-surface-2 px-5 text-sm font-medium text-muted" data-testid="next-locked">
                <IconLock size={16} /> {itemTitle(data, next)}
              </span>
            ) : (
              <Link
                href={itemHref(next)}
                className="inline-flex h-11 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-ink transition hover:brightness-110"
                data-testid="next-item"
              >
                הבא: {itemTitle(data, next)}
              </Link>
            )
          ) : (
            <Link href="/" className="inline-flex h-11 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-ink">
              חזרה לדף הבית
            </Link>
          )}
          <Link href={routes.topic(lesson.topic_id)} className="inline-flex h-11 items-center rounded-xl border border-line px-5 text-sm font-medium hover:bg-surface-2">
            חזרה לנושא
          </Link>
        </div>
        <button onClick={() => void setStatus(false)} disabled={busy} className="text-sm text-muted hover:text-ink hover:underline">
          בטל סימון השלמה
        </button>
      </div>
    );

  const pending = STEPS.filter((s) => s.key !== "complete");
  return (
    <div className="space-y-5">
      <ul className="grid gap-2 sm:grid-cols-3">
        {pending.map((s) => (
          <li
            key={s.key}
            className={cx("flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm", steps[s.key] ? "bg-success-soft text-success" : "bg-surface-2 text-muted")}
          >
            <span className={cx("grid size-5 place-items-center rounded-full", steps[s.key] ? "bg-success text-success-ink" : "border-2 border-line")}>
              {steps[s.key] && <IconCheck size={12} strokeWidth={3} />}
            </span>
            {s.key === "quiz" && qs.hasQuestions ? (steps.quiz ? "מבחן — עבר" : "מבחן — לא עבר") : s.label}
          </li>
        ))}
      </ul>
      {passNote}
      {!pending.every((s) => steps[s.key]) && !blocksNext && (
        <p className="text-sm text-muted">אפשר לסמן את השיעור כהושלם גם אם דילגת על שלב — אבל מומלץ לעבור על כולם.</p>
      )}
      <Button variant="success" size="lg" onClick={() => void setStatus(true)} disabled={busy} className="w-full" data-testid="complete-lesson">
        <IconFlag size={19} />
        סמן שיעור כהושלם
      </Button>
    </div>
  );
}
