"use client";

import Link from "next/link";
import { courseProgress, lessonNumber, lessonsOfTopic, quizStats, statusOf, topicProgress } from "@/lib/progress";
import type { CourseData } from "@/lib/types";
import { WithData } from "../app-shell";
import { Card, PageHeader, ProgressBar, StatusBadge } from "../ui";

export function ProgressScreen() {
  return <WithData>{(data) => <ProgressView data={data} />}</WithData>;
}

const date = (iso: string) => new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "short" });

function ProgressView({ data }: { data: CourseData }) {
  const overall = courseProgress(data);
  const count = (s: string) => data.lessons.filter((l) => statusOf(data, l.id) === s).length;
  const bests = data.lessons.map((l) => quizStats(data, l.id).best?.percent).filter((v): v is number => v !== undefined);
  const avg = bests.length ? Math.round(bests.reduce((a, b) => a + b, 0) / bests.length) : null;

  const tiles = [
    { label: "הושלמו", value: count("completed"), tone: "text-success" },
    { label: "בתהליך", value: count("in_progress"), tone: "text-warn" },
    { label: "לא התחילו", value: count("not_started"), tone: "text-muted" },
    { label: "ממוצע מבחנים", value: avg === null ? "—" : `${avg}%`, tone: "text-accent" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="התקדמות" title={`${overall.percent}% מהקורס הושלם`}>
        <span className="num">
          {overall.completed} / {overall.total} שיעורים
        </span>
        <div className="mt-4 max-w-xl">
          <ProgressBar percent={overall.percent} size="lg" />
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <Card key={t.label} className="p-5 anim-rise" style={{ animationDelay: `${i * 40}ms` }}>
            <div className={`num text-3xl font-bold ${t.tone}`}>{t.value}</div>
            <div className="mt-1 text-sm text-ink-2">{t.label}</div>
          </Card>
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">לפי נושא</h2>
        {data.topics.map((t, i) => {
          const p = topicProgress(data, t.id);
          return (
            <Card key={t.id} className="overflow-hidden">
              <div className="p-5">
                <div className="num mb-2 flex items-baseline justify-between gap-3">
                  <Link href={`/topics/${t.id}`} className="truncate font-semibold hover:text-accent">
                    <span className="text-muted">נושא {i + 1} · </span>
                    {t.title}
                  </Link>
                  <span className="shrink-0 text-sm text-ink-2">
                    {p.completed}/{p.total} · <span className="font-semibold text-ink">{p.percent}%</span>
                  </span>
                </div>
                <ProgressBar percent={p.percent} size="sm" />
              </div>
              {lessonsOfTopic(data, t.id).length > 0 && (
                <div className="overflow-x-auto border-t border-line">
                  <table className="num w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="text-start text-xs text-muted">
                        <th className="px-5 py-2.5 text-start font-medium">שיעור</th>
                        <th className="px-3 py-2.5 text-start font-medium">סטטוס</th>
                        <th className="px-3 py-2.5 text-start font-medium">ציון גבוה</th>
                        <th className="px-3 py-2.5 text-start font-medium">ניסיונות</th>
                        <th className="px-5 py-2.5 text-start font-medium">הושלם</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {lessonsOfTopic(data, t.id).map((l) => {
                        const qs = quizStats(data, l.id);
                        const done = data.progress[l.id]?.completed_at;
                        return (
                          <tr key={l.id} className="hover:bg-surface-2">
                            <td className="px-5 py-3">
                              <Link href={`/lessons/${l.id}`} className="font-medium hover:text-accent">
                                <span className="text-muted">{lessonNumber(data, l.id)}. </span>
                                {l.title}
                              </Link>
                            </td>
                            <td className="px-3 py-3">
                              <StatusBadge status={statusOf(data, l.id)} />
                            </td>
                            <td className="px-3 py-3">{qs.best ? `${qs.best.score}/${qs.best.total} (${qs.best.percent}%)` : "—"}</td>
                            <td className="px-3 py-3">{qs.count || "—"}</td>
                            <td className="px-5 py-3 text-ink-2">{done && statusOf(data, l.id) === "completed" ? date(done) : "—"}</td>
                          </tr>
                        );
                      })}
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
