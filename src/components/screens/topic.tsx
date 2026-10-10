"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { lessonsOfTopic, topicProgress } from "@/lib/progress";
import type { CourseData } from "@/lib/types";
import { WithData } from "../app-shell";
import { LessonRow } from "../lesson-row";
import { Card, Empty, ProgressBar } from "../ui";

export function TopicScreen() {
  const { topicId } = useParams<{ topicId: string }>();
  return <WithData>{(data) => <TopicView data={data} topicId={topicId} />}</WithData>;
}

function TopicView({ data, topicId }: { data: CourseData; topicId: string }) {
  const index = data.topics.findIndex((t) => t.id === topicId);
  const topic = data.topics[index];
  if (!topic)
    return (
      <Empty title="הנושא לא נמצא">
        <Link href="/course" className="text-accent">
          חזרה לקורס
        </Link>
      </Empty>
    );
  const lessons = lessonsOfTopic(data, topic.id);
  const p = topicProgress(data, topic.id);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-muted anim-rise">
        <Link href="/course" className="hover:text-ink">
          {data.course.title}
        </Link>
        <span className="mx-2">/</span>
        <span className="num">נושא {index + 1}</span>
      </nav>

      <header className="anim-rise">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{topic.title}</h1>
        {topic.description && <p className="mt-2 max-w-2xl text-ink-2">{topic.description}</p>}
      </header>

      <Card className="p-5 anim-rise sm:p-6" data-testid="topic-progress">
        <div className="num mb-3 flex items-baseline justify-between">
          <span className="text-sm text-ink-2">
            <span className="font-semibold text-ink">{p.completed}</span> מתוך {p.total} שיעורים הושלמו
          </span>
          <span className="text-2xl font-bold">{p.percent}%</span>
        </div>
        <ProgressBar percent={p.percent} label="התקדמות בנושא" />
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-bold">שיעורים</h2>
        {lessons.length === 0 ? (
          <Empty title="אין שיעורים בנושא הזה">אפשר להוסיף שיעורים מעמוד הניהול.</Empty>
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {lessons.map((l) => (
                <LessonRow key={l.id} data={data} lesson={l} />
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
