"use client";

import Link from "next/link";
import {
  continueLesson,
  courseProgress,
  lessonNumber,
  lessonsOfTopic,
  statusOf,
  topicOf,
  topicProgress,
} from "@/lib/progress";
import type { CourseData } from "@/lib/types";
import { WithData } from "../app-shell";
import { IconArrowBack, IconCheck, IconClock, IconPlay } from "../icons";
import { Card, Empty, ProgressBar, cx } from "../ui";

export function Dashboard() {
  return <WithData>{(data) => <DashboardView data={data} />}</WithData>;
}

function DashboardView({ data }: { data: CourseData }) {
  const overall = courseProgress(data);

  return (
    <div className="space-y-8">
      <header className="anim-rise">
        <div className="mb-2 text-sm font-medium text-muted">הקורס שלי</div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{data.course.title}</h1>
        {data.course.description && <p className="mt-2 max-w-2xl text-ink-2">{data.course.description}</p>}
      </header>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Overall progress */}
        <Card className="p-6 anim-rise lg:col-span-2" data-testid="overall-progress">
          <div className="text-sm font-medium text-ink-2">התקדמות כוללת</div>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div className="num text-5xl font-bold tracking-tight">
              {overall.percent}
              <span className="text-2xl text-muted">%</span>
            </div>
            <div className="num pb-1.5 text-sm text-ink-2">
              <span className="font-semibold text-ink">{overall.completed}</span> / {overall.total} שיעורים הושלמו
            </div>
          </div>
          <div className="mt-5">
            <ProgressBar percent={overall.percent} size="lg" label="התקדמות כוללת" />
          </div>
        </Card>

        {/* Continue learning */}
        <ContinueCard data={data} />
      </div>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-bold">נושאים</h2>
          <span className="num text-sm text-muted">{data.topics.length} נושאים</span>
        </div>
        {data.topics.length === 0 ? (
          <Empty title="אין עדיין נושאים">הוסף נושאים ושיעורים מעמוד הניהול.</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.topics.map((t, i) => {
              const p = topicProgress(data, t.id);
              const done = p.total > 0 && p.completed === p.total;
              return (
                <Link
                  key={t.id}
                  href={`/topics/${t.id}`}
                  className="group anim-rise"
                  style={{ animationDelay: `${i * 50}ms` }}
                  data-testid="topic-card"
                >
                  <Card className="flex h-full flex-col p-5 transition group-hover:-translate-y-0.5 group-hover:border-accent/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="num text-xs font-medium text-muted">נושא {i + 1}</div>
                        <h3 className="mt-1 truncate text-lg font-semibold">{t.title}</h3>
                      </div>
                      {done && (
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-success text-white anim-pop">
                          <IconCheck size={15} strokeWidth={2.6} />
                        </span>
                      )}
                    </div>
                    <div className="num mt-4 flex items-baseline justify-between text-sm">
                      <span className="text-ink-2">
                        {p.completed} מתוך {p.total} שיעורים
                      </span>
                      <span className="font-semibold">{p.percent}%</span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar percent={p.percent} size="sm" />
                    </div>
                    <div className="mt-5 flex items-center justify-end gap-1.5 text-sm font-medium text-accent">
                      כניסה לנושא
                      <IconArrowBack size={16} className="rotate-180 transition group-hover:-translate-x-1" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function ContinueCard({ data }: { data: CourseData }) {
  const next = continueLesson(data);
  if (!next) {
    const any = data.lessons.length > 0;
    return (
      <Card className="flex flex-col justify-center p-6 anim-rise lg:col-span-3" data-testid="continue-card">
        <div className="text-sm font-medium text-ink-2">המשך ללמוד</div>
        <div className="mt-2 text-2xl font-bold">{any ? "סיימת את כל השיעורים 🎉" : "אין עדיין שיעורים"}</div>
      </Card>
    );
  }
  const topic = topicOf(data, next);
  const status = statusOf(data, next.id);
  const num = lessonNumber(data, next.id);
  const topicLessons = topic ? lessonsOfTopic(data, topic.id) : [];

  return (
    <Link
      href={`/lessons/${next.id}`}
      className="group anim-rise lg:col-span-3"
      style={{ animationDelay: "60ms" }}
      data-testid="continue-card"
    >
      <div className="relative h-full overflow-hidden rounded-2xl bg-accent p-6 text-accent-ink shadow-card transition group-hover:-translate-y-0.5">
        <div
          className="pointer-events-none absolute -top-16 -left-10 size-56 rounded-full bg-white/10"
          aria-hidden
        />
        <div className="pointer-events-none absolute -bottom-20 left-24 size-40 rounded-full bg-white/10" aria-hidden />
        <div className="relative flex h-full flex-col">
          <div className="text-sm font-medium opacity-80">
            {status === "in_progress" ? "המשך מאיפה שעצרת" : "המשך ללמוד"}
          </div>
          <div className="num mt-2 text-2xl font-bold sm:text-3xl">המשך לשיעור {num}</div>
          <div className="ut mt-1 truncate opacity-90">
            {next.title}
            {topic && <span className="opacity-70"> · {topic.title}</span>}
          </div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
            <div className="num flex items-center gap-4 text-sm opacity-80">
              <span className="flex items-center gap-1.5">
                <IconClock size={16} /> {next.duration_minutes} דק׳
              </span>
              {topic && (
                <span>
                  שיעור {topicLessons.findIndex((l) => l.id === next.id) + 1} מתוך {topicLessons.length} בנושא
                </span>
              )}
            </div>
            <span
              className={cx(
                "inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#1e1b4b] transition group-hover:gap-3",
              )}
            >
              <IconPlay size={16} />
              {status === "in_progress" ? "המשך" : "התחל"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
