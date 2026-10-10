"use client";

import Link from "next/link";
import { lessonNumber, quizStats, statusOf } from "@/lib/progress";
import type { CourseData, Lesson } from "@/lib/types";
import { IconChevron, IconClock } from "./icons";
import { StatusBadge, StatusDot } from "./ui";

export function LessonRow({ data, lesson }: { data: CourseData; lesson: Lesson }) {
  const status = statusOf(data, lesson.id);
  const num = lessonNumber(data, lesson.id);
  const best = quizStats(data, lesson.id).best;
  return (
    <li>
      <Link
        href={`/lessons/${lesson.id}`}
        className="group flex items-center gap-4 px-4 py-4 transition hover:bg-surface-2 sm:px-5"
        data-testid="lesson-row"
        data-status={status}
      >
        <StatusDot status={status} number={num} />
        <div className="min-w-0 flex-1">
          <div className="num text-xs text-muted">שיעור {num}</div>
          <div className="ut truncate font-medium">{lesson.title}</div>
          <div className="num mt-0.5 flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <IconClock size={13} /> {lesson.duration_minutes} דק׳
            </span>
            {best && <span>ציון מבחן: {best.percent}%</span>}
          </div>
        </div>
        <StatusBadge status={status} />
        <IconChevron size={18} className="hidden shrink-0 text-muted transition group-hover:-translate-x-0.5 sm:block" />
      </Link>
    </li>
  );
}
