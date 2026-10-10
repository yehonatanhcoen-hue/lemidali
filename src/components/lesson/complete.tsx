"use client";

import Link from "next/link";
import { useState } from "react";
import { STEPS, type StepKey, topicProgress } from "@/lib/progress";
import { useCourse } from "@/lib/store";
import type { CourseData, Lesson } from "@/lib/types";
import { IconCheck, IconFlag } from "../icons";
import { Button, ProgressBar, cx } from "../ui";

export function CompleteSection({
  data,
  lesson,
  steps,
  nextLesson,
}: {
  data: CourseData;
  lesson: Lesson;
  steps: Record<StepKey, boolean>;
  nextLesson: Lesson | null;
}) {
  const { actions } = useCourse();
  const [busy, setBusy] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const completed = steps.complete;
  const tp = topicProgress(data, lesson.topic_id);

  const complete = async () => {
    setBusy(true);
    await actions.upsertProgress(lesson.id, { status: "completed", completed_at: new Date().toISOString() });
    setJustCompleted(true);
    setBusy(false);
  };
  const undo = async () => {
    setBusy(true);
    await actions.upsertProgress(lesson.id, { status: "in_progress", completed_at: null });
    setJustCompleted(false);
    setBusy(false);
  };

  if (completed)
    return (
      <div className="text-center" data-testid="lesson-completed">
        <span
          className={cx(
            "mx-auto grid size-16 place-items-center rounded-full bg-success text-white",
            justCompleted && "anim-pop anim-ring",
          )}
        >
          <IconCheck size={32} strokeWidth={2.6} />
        </span>
        <div className="mt-4 text-xl font-bold">{justCompleted ? "כל הכבוד! השיעור הושלם" : "השיעור הושלם"}</div>
        <div className="mx-auto mt-4 max-w-sm">
          <div className="num mb-1.5 flex justify-between text-sm text-ink-2">
            <span>התקדמות בנושא</span>
            <span className="font-semibold text-ink">
              {tp.completed}/{tp.total} · {tp.percent}%
            </span>
          </div>
          <ProgressBar percent={tp.percent} />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {nextLesson ? (
            <Link
              href={`/lessons/${nextLesson.id}`}
              className="inline-flex h-11 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-ink transition hover:brightness-110"
              data-testid="next-lesson"
            >
              לשיעור הבא: {nextLesson.title}
            </Link>
          ) : (
            <Link href="/" className="inline-flex h-11 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-ink">
              חזרה לדף הבית
            </Link>
          )}
          <Link
            href={`/topics/${lesson.topic_id}`}
            className="inline-flex h-11 items-center rounded-xl border border-line px-5 text-sm font-medium hover:bg-surface-2"
          >
            חזרה לנושא
          </Link>
        </div>
        <button onClick={undo} disabled={busy} className="mt-5 text-sm text-muted hover:text-ink hover:underline">
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
            className={cx(
              "flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm",
              steps[s.key] ? "bg-success-soft text-success" : "bg-surface-2 text-muted",
            )}
          >
            <span
              className={cx(
                "grid size-5 place-items-center rounded-full",
                steps[s.key] ? "bg-success text-white" : "border-2 border-line",
              )}
            >
              {steps[s.key] && <IconCheck size={12} strokeWidth={3} />}
            </span>
            {s.label}
          </li>
        ))}
      </ul>
      {!pending.every((s) => steps[s.key]) && (
        <p className="text-sm text-muted">אפשר לסמן את השיעור כהושלם גם אם דילגת על שלב — אבל מומלץ לעבור על כולם.</p>
      )}
      <Button variant="success" size="lg" onClick={complete} disabled={busy} className="w-full" data-testid="complete-lesson">
        <IconFlag size={19} />
        סמן שיעור כהושלם
      </Button>
    </div>
  );
}
