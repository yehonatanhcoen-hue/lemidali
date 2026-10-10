"use client";

import Link from "next/link";
import {
  courseProgress,
  gates,
  lessonNumber,
  lessonQuiz,
  lessonsOfTopic,
  mistakes,
  questionsOf,
  quizStats,
  statusOf,
  topicExam,
  topicProgress,
} from "@/lib/progress";
import type { CourseData } from "@/lib/types";
import { WithData } from "../app-shell";
import { IconLock } from "../icons";
import { Card, PageHeader, ProgressBar, StatusBadge, cx, Frac } from "../ui";
import { routes } from "@/lib/routes";

export function ProgressScreen() {
  return <WithData>{(data) => <ProgressView data={data} />}</WithData>;
}

const date = (iso: string) => new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "short" });

function ProgressView({ data }: { data: CourseData }) {
  const overall = courseProgress(data);
  const g = gates(data);
  const count = (s: string) => data.lessons.filter((l) => statusOf(data, l.id) === s).length;
  const withQuiz = data.quizzes.filter((q) => questionsOf(data, q.id).length);
  const passed = withQuiz.filter((q) => {
    const s = quizStats(data, q);
    return s.count > 0 && s.passed;
  }).length;
  const wrong = mistakes(data).length;

  const tiles = [
    { label: "שיעורים הושלמו", value: `${count("completed")}/${data.lessons.length}`, tone: "text-success" },
    { label: "בתהליך", value: String(count("in_progress")), tone: "text-warn" },
    { label: "מבחנים שעברת", value: `${passed}/${withQuiz.length}`, tone: "text-accent" },
    { label: "שאלות לחזרה", value: String(wrong), tone: wrong ? "text-danger" : "text-muted", href: "/practice" },
  ];

  const scoreCell = (quizId: string | undefined) => {
    const quiz = data.quizzes.find((q) => q.id === quizId);
    const s = quizStats(data, quiz);
    if (!s.hasQuestions) return <span className="text-muted">אין מבחן</span>;
    if (!s.best) return <span className="text-muted">—</span>;
    return (
      <span className={s.passed ? "text-success" : "text-warn"}>
        {s.best.percent}%{s.passed ? " ✓" : ` / ${s.passing}%`}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="התקדמות" title={`${overall.percent}% מהקורס הושלם`}>
        <span className="num">
          <Frac a={overall.completed} b={overall.total} /> שיעורים
        </span>
        <div className="mt-4 max-w-xl">
          <ProgressBar percent={overall.percent} size="lg" />
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t, i) => {
          const body = (
            <Card className="h-full p-5 anim-rise" style={{ animationDelay: `${i * 40}ms` }}>
              <div className={`num text-3xl font-bold ${t.tone}`}>{t.value}</div>
              <div className="mt-1 text-sm text-ink-2">{t.label}</div>
            </Card>
          );
          return t.href ? (
            <Link key={t.label} href={t.href} className="block">
              {body}
            </Link>
          ) : (
            <div key={t.label}>{body}</div>
          );
        })}
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">לפי נושא</h2>
        {data.topics.map((t, i) => {
          const p = topicProgress(data, t.id);
          const exam = topicExam(data, t.id);
          const lessons = lessonsOfTopic(data, t.id);
          return (
            <Card key={t.id} className="overflow-hidden">
              <div className="p-5">
                <div className="num mb-2 flex items-baseline justify-between gap-3">
                  <Link href={routes.topic(t.id)} className="truncate font-semibold hover:text-accent">
                    <span className="text-muted">נושא {i + 1} · </span>
                    {t.title}
                  </Link>
                  <span className="shrink-0 text-sm text-ink-2">
                    <Frac a={p.completed} b={p.total} /> · <span className="font-semibold text-ink">{p.percent}%</span>
                  </span>
                </div>
                <ProgressBar percent={p.percent} size="sm" />
              </div>
              {lessons.length > 0 && (
                <div className="overflow-x-auto border-t border-line">
                  <table className="num w-full min-w-[540px] text-sm">
                    <thead>
                      <tr className="text-xs text-muted">
                        <th className="px-5 py-2.5 text-start font-medium">שיעור</th>
                        <th className="px-3 py-2.5 text-start font-medium">סטטוס</th>
                        <th className="px-3 py-2.5 text-start font-medium">מבחן (הכי גבוה)</th>
                        <th className="px-3 py-2.5 text-start font-medium">ניסיונות</th>
                        <th className="px-5 py-2.5 text-start font-medium">הושלם</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {lessons.map((l) => {
                        const quiz = lessonQuiz(data, l.id);
                        const qs = quizStats(data, quiz);
                        const done = data.progress[l.id]?.completed_at;
                        const locked = g.get(l.id)?.locked;
                        return (
                          <tr key={l.id} className={cx("hover:bg-surface-2", locked && "opacity-60")}>
                            <td className="px-5 py-3">
                              <Link href={routes.lesson(l.id)} className="font-medium hover:text-accent">
                                <span className="text-muted">{lessonNumber(data, l.id)}. </span>
                                {l.title}
                              </Link>
                            </td>
                            <td className="px-3 py-3">
                              {locked ? (
                                <span className="inline-flex items-center gap-1 text-xs text-muted">
                                  <IconLock size={13} /> נעול
                                </span>
                              ) : (
                                <StatusBadge status={statusOf(data, l.id)} />
                              )}
                            </td>
                            <td className="px-3 py-3">{scoreCell(quiz?.id)}</td>
                            <td className="px-3 py-3">{qs.count || "—"}</td>
                            <td className="px-5 py-3 text-ink-2">{done && statusOf(data, l.id) === "completed" ? date(done) : "—"}</td>
                          </tr>
                        );
                      })}
                      {exam && questionsOf(data, exam.id).length > 0 && (
                        <tr className="bg-accent-soft/30">
                          <td className="px-5 py-3 font-medium">
                            <Link href={routes.exam(t.id)} className="hover:text-accent">
                              🏆 מבחן סיכום
                            </Link>
                          </td>
                          <td className="px-3 py-3 text-xs text-muted">{g.get(exam.id)?.locked ? "נעול" : ""}</td>
                          <td className="px-3 py-3">{scoreCell(exam.id)}</td>
                          <td className="px-3 py-3">{quizStats(data, exam).count || "—"}</td>
                          <td className="px-5 py-3" />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          );
        })}
      </section>
    </div>
  );
}
