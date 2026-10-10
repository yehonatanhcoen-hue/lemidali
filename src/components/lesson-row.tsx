"use client";

import Link from "next/link";
import { type Gate, lessonNumber, lessonQuiz, questionsOf, quizStats, statusOf } from "@/lib/progress";
import type { CourseData, Lesson, Quiz, Topic } from "@/lib/types";
import { IconCheck, IconChevron, IconClock, IconLock, IconTrophy } from "./icons";
import { StatusBadge, StatusDot, cx } from "./ui";

function LockDot() {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
      <IconLock size={16} />
    </span>
  );
}

export function LessonRow({ data, lesson, gate }: { data: CourseData; lesson: Lesson; gate?: Gate }) {
  const status = statusOf(data, lesson.id);
  const num = lessonNumber(data, lesson.id);
  const qs = quizStats(data, lessonQuiz(data, lesson.id));
  const locked = gate?.locked ?? false;
  return (
    <li>
      <Link
        href={`/lessons/${lesson.id}`}
        className={cx("group flex items-center gap-4 px-4 py-4 transition hover:bg-surface-2 sm:px-5", locked && "opacity-60")}
        data-testid="lesson-row"
        data-status={status}
        data-locked={locked}
      >
        {locked ? <LockDot /> : <StatusDot status={status} number={num} />}
        <div className="min-w-0 flex-1">
          <div className="num text-xs text-muted">שיעור {num}</div>
          <div className="ut truncate font-medium">{lesson.title}</div>
          <div className="num mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <IconClock size={13} /> {lesson.duration_minutes} דק׳
            </span>
            {qs.hasQuestions && (
              <span className={cx(qs.best && (qs.passed ? "text-success" : "text-warn"))}>
                מבחן: {qs.best ? `${qs.best.percent}%${qs.passed ? " ✓" : ""}` : "טרם נבחנת"}
              </span>
            )}
          </div>
        </div>
        {locked ? (
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">נעול</span>
        ) : (
          <StatusBadge status={status} />
        )}
        <IconChevron size={18} className="hidden shrink-0 text-muted transition group-hover:-translate-x-0.5 sm:block" />
      </Link>
    </li>
  );
}

export function ExamRow({ data, topic, quiz, gate }: { data: CourseData; topic: Topic; quiz: Quiz; gate?: Gate }) {
  const qs = quizStats(data, quiz);
  const locked = gate?.locked ?? false;
  const count = questionsOf(data, quiz.id).length;
  return (
    <li>
      <Link
        href={`/topics/${topic.id}/exam`}
        className={cx("group flex items-center gap-4 bg-accent-soft/40 px-4 py-4 transition hover:bg-accent-soft sm:px-5", locked && "opacity-60")}
        data-testid="exam-row"
        data-locked={locked}
        data-passed={qs.passed && qs.count > 0}
      >
        {locked ? (
          <LockDot />
        ) : (
          <span className={cx("grid size-9 shrink-0 place-items-center rounded-full", qs.passed && qs.count ? "bg-success text-white" : "bg-accent text-accent-ink")}>
            {qs.passed && qs.count ? <IconCheck size={18} strokeWidth={2.4} /> : <IconTrophy size={18} />}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted">מבחן סיכום נושא</div>
          <div className="ut truncate font-medium">{quiz.title || `מבחן סיכום — ${topic.title}`}</div>
          <div className="num mt-0.5 text-xs text-muted">
            {count} שאלות · ציון עובר {qs.passing}%{qs.best && ` · הכי גבוה ${qs.best.percent}%`}
          </div>
        </div>
        <span
          className={cx(
            "rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
            locked ? "bg-surface-2 text-muted" : qs.passed && qs.count ? "bg-success-soft text-success" : qs.count ? "bg-warn-soft text-warn" : "bg-surface text-ink-2",
          )}
        >
          {locked ? "נעול" : qs.passed && qs.count ? "עבר" : qs.count ? "לא עבר" : "טרם נבחנת"}
        </span>
        <IconChevron size={18} className="hidden shrink-0 text-muted sm:block" />
      </Link>
    </li>
  );
}
