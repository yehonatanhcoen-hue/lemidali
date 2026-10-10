"use client";

import Link from "next/link";
import {
  continueItem,
  courseProgress,
  gates,
  itemHref,
  lessonNumber,
  lessonsOfTopic,
  mistakes,
  questionsOf,
  quizStats,
  statusOf,
  topicExam,
  topicOf,
  topicProgress,
} from "@/lib/progress";
import type { CourseData } from "@/lib/types";
import { WithData } from "../app-shell";
import { IconArrowBack, IconCheck, IconClock, IconLock, IconPlay, IconTarget, IconTrophy } from "../icons";
import { Card, Empty, ProgressBar, cx, Frac } from "../ui";
import { routes } from "@/lib/routes";

export function Dashboard() {
  return <WithData>{(data) => <DashboardView data={data} />}</WithData>;
}

function DashboardView({ data }: { data: CourseData }) {
  const overall = courseProgress(data);
  const wrong = mistakes(data).length;
  const g = gates(data);

  return (
    <div className="space-y-8">
      <header className="anim-rise">
        <div className="mb-2 text-sm font-medium text-muted">הקורס שלי</div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{data.course.title}</h1>
        {data.course.description && <p className="mt-2 max-w-2xl text-ink-2">{data.course.description}</p>}
      </header>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* the next step comes first — on phones it is the first thing on screen */}
        <ContinueCard data={data} />
        <Card className="p-6 anim-rise lg:col-span-2" data-testid="overall-progress">
          <div className="text-sm font-medium text-ink-2">התקדמות כוללת</div>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div className="num text-5xl font-bold tracking-tight">
              {overall.percent}
              <span className="text-2xl text-muted">%</span>
            </div>
            <div className="num pb-1.5 text-sm text-ink-2">
              <Frac a={<span className="font-semibold text-ink">{overall.completed}</span>} b={overall.total} /> שיעורים הושלמו
            </div>
          </div>
          <div className="mt-5">
            <ProgressBar percent={overall.percent} size="lg" label="התקדמות כוללת" />
          </div>
        </Card>
      </div>

      {wrong > 0 && (
        <Link href="/practice" className="group block anim-rise" data-testid="mistakes-banner">
          <Card className="flex items-center gap-4 border-warn/30 p-4 transition group-hover:border-warn/60 sm:p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-warn-soft text-warn">
              <IconTarget size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="num font-semibold">{wrong} שאלות לחזרה</div>
              <div className="text-sm text-ink-2">תרגל את השאלות שטעית בהן מכל הקורס</div>
            </div>
            <IconArrowBack size={18} className="rotate-180 text-warn transition group-hover:-translate-x-1" />
          </Card>
        </Link>
      )}

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
              const first = lessonsOfTopic(data, t.id)[0];
              const locked = first ? g.get(first.id)?.locked : false;
              const exam = topicExam(data, t.id);
              const examStats = exam && questionsOf(data, exam.id).length ? quizStats(data, exam) : null;
              return (
                <Link key={t.id} href={routes.topic(t.id)} className="group anim-rise" style={{ animationDelay: `${i * 50}ms` }} data-testid="topic-card">
                  <Card className={cx("flex h-full flex-col p-5 transition group-hover:-translate-y-0.5 group-hover:border-accent/40", locked && "opacity-70")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="num text-xs font-medium text-muted">נושא {i + 1}</div>
                        <h3 className="mt-1 truncate text-lg font-semibold">{t.title}</h3>
                      </div>
                      {locked ? (
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-muted" title="נעול">
                          <IconLock size={14} />
                        </span>
                      ) : (
                        done && (
                          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-success text-success-ink anim-pop">
                            <IconCheck size={15} strokeWidth={2.6} />
                          </span>
                        )
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
                    <div className="mt-5 flex items-center justify-between gap-2 text-sm">
                      {examStats ? (
                        <span
                          className={cx(
                            "num flex items-center gap-1.5 text-xs",
                            examStats.count && examStats.passed ? "text-success" : "text-muted",
                          )}
                        >
                          <IconTrophy size={14} />
                          {examStats.count && examStats.passed ? "מבחן סיכום עבר" : "מבחן סיכום"}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="flex items-center gap-1.5 font-medium text-accent">
                        כניסה לנושא
                        <IconArrowBack size={16} className="rotate-180 transition group-hover:-translate-x-1" />
                      </span>
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
  const next = continueItem(data);
  if (!next) {
    const any = data.lessons.length > 0;
    return (
      <Card className="flex flex-col justify-center p-6 anim-rise lg:col-span-3" data-testid="continue-card">
        <div className="text-sm font-medium text-ink-2">המשך ללמוד</div>
        <div className="mt-2 text-2xl font-bold">{any ? "סיימת את כל הקורס 🎉" : "אין עדיין שיעורים"}</div>
      </Card>
    );
  }

  const isExam = next.kind === "exam";
  const lesson = next.kind === "lesson" ? next.lesson : null;
  const topic = lesson ? topicOf(data, lesson) : next.kind === "exam" ? next.topic : undefined;
  const status = lesson ? statusOf(data, lesson.id) : "not_started";
  const topicLessons = topic ? lessonsOfTopic(data, topic.id) : [];
  const resume = status === "in_progress";

  return (
    <Link href={itemHref(next)} className="group anim-rise lg:col-span-3" style={{ animationDelay: "60ms" }} data-testid="continue-card">
      <div className="relative h-full overflow-hidden rounded-2xl bg-accent p-6 text-accent-ink shadow-[var(--press)] transition group-hover:-translate-y-0.5">
        <div className="pointer-events-none absolute -top-16 -left-10 size-56 rounded-full bg-accent-ink/10" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 left-24 size-40 rounded-full bg-accent-ink/10" aria-hidden />
        <div className="relative flex h-full flex-col">
          <div className="text-sm font-medium opacity-80">{resume ? "המשך מאיפה שעצרת" : "המשך ללמוד"}</div>
          <div className="num mt-2 text-2xl font-bold sm:text-3xl">
            {isExam ? "מבחן סיכום נושא" : `המשך לשיעור ${lessonNumber(data, lesson!.id)}`}
          </div>
          <div className="ut mt-1 truncate opacity-90">
            {lesson ? lesson.title : topic?.title}
            {lesson && topic && <span className="opacity-70"> · {topic.title}</span>}
          </div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
            <div className="num flex items-center gap-4 text-sm opacity-80">
              {lesson ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <IconClock size={16} /> {lesson.duration_minutes} דק׳
                  </span>
                  {topic && (
                    <span>
                      שיעור {topicLessons.findIndex((l) => l.id === lesson.id) + 1} מתוך {topicLessons.length} בנושא
                    </span>
                  )}
                </>
              ) : (
                <span className="flex items-center gap-1.5">
                  <IconTrophy size={16} /> {questionsOf(data, next.quiz?.id).length} שאלות
                </span>
              )}
            </div>
            <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-surface px-5 text-sm font-semibold text-accent transition group-hover:gap-3">
              <IconPlay size={16} />
              {resume ? "המשך" : "התחל"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
