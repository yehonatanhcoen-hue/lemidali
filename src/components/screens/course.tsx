"use client";

import Link from "next/link";
import { courseProgress, gates, lessonsOfTopic, questionsOf, topicExam, topicProgress } from "@/lib/progress";
import type { CourseData } from "@/lib/types";
import { WithData } from "../app-shell";
import { ExamRow, LessonRow } from "../lesson-row";
import { Card, Empty, PageHeader, ProgressBar } from "../ui";

/** Full course outline: every topic with its lessons. */
export function CourseScreen() {
  return <WithData>{(data) => <CourseView data={data} />}</WithData>;
}

function CourseView({ data }: { data: CourseData }) {
  const overall = courseProgress(data);
  const g = gates(data);
  return (
    <div>
      <PageHeader eyebrow="מבנה הקורס" title={data.course.title}>
        <span className="num">
          {data.topics.length} נושאים · {overall.total} שיעורים · {overall.percent}% הושלם
        </span>
      </PageHeader>

      {data.topics.length === 0 ? (
        <Empty title="אין עדיין נושאים">הוסף נושאים מעמוד הניהול.</Empty>
      ) : (
        <div className="space-y-6">
          {data.topics.map((t, i) => {
            const p = topicProgress(data, t.id);
            const lessons = lessonsOfTopic(data, t.id);
            const exam = topicExam(data, t.id);
            return (
              <Card key={t.id} className="overflow-hidden anim-rise" style={{ animationDelay: `${i * 50}ms` }}>
                <Link href={`/topics/${t.id}`} className="block border-b border-line p-5 transition hover:bg-surface-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <div className="num text-xs text-muted">נושא {i + 1}</div>
                      <h2 className="truncate text-lg font-semibold">{t.title}</h2>
                    </div>
                    <span className="num text-sm font-semibold">{p.percent}%</span>
                  </div>
                  <div className="mt-3">
                    <ProgressBar percent={p.percent} size="sm" />
                  </div>
                </Link>
                {lessons.length ? (
                  <ul className="divide-y divide-line">
                    {lessons.map((l) => (
                      <LessonRow key={l.id} data={data} lesson={l} gate={g.get(l.id)} />
                    ))}
                    {exam && questionsOf(data, exam.id).length > 0 && (
                      <ExamRow data={data} topic={t} quiz={exam} gate={g.get(exam.id)} />
                    )}
                  </ul>
                ) : (
                  <div className="p-5 text-sm text-muted">אין שיעורים בנושא הזה עדיין.</div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
