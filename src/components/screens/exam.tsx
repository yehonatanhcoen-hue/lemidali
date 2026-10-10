"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { gateOf, lessonsOfTopic, questionsOf, quizStats, sequence, topicExam } from "@/lib/progress";
import type { CourseData } from "@/lib/types";
import { WithData } from "../app-shell";
import { IconTrophy } from "../icons";
import { LockedCard } from "../locked";
import { QuizPanel } from "../quiz/quiz-panel";
import { Card, Empty } from "../ui";

export function ExamScreen() {
  const { topicId } = useParams<{ topicId: string }>();
  return <WithData>{(data) => <ExamView key={topicId} data={data} topicId={topicId} />}</WithData>;
}

function ExamView({ data, topicId }: { data: CourseData; topicId: string }) {
  const index = data.topics.findIndex((t) => t.id === topicId);
  const topic = data.topics[index];
  const quiz = topic ? topicExam(data, topic.id) : undefined;
  if (!topic || !quiz || !questionsOf(data, quiz.id).length)
    return (
      <Empty title="אין מבחן סיכום לנושא הזה">
        <Link href={topic ? `/topics/${topic.id}` : "/course"} className="text-accent">
          חזרה
        </Link>
      </Empty>
    );

  const gate = gateOf(data, quiz.id);
  const stats = quizStats(data, quiz);
  const seq = sequence(data);
  const next = seq[seq.findIndex((i) => i.id === quiz.id) + 1];

  return (
    <div className="space-y-6">
      <nav className="num flex flex-wrap gap-x-2 text-sm text-muted anim-rise">
        <Link href="/course" className="hover:text-ink">
          {data.course.title}
        </Link>
        <span>/</span>
        <Link href={`/topics/${topic.id}`} className="hover:text-ink">
          {topic.title}
        </Link>
        <span>/</span>
        <span>מבחן סיכום</span>
      </nav>

      <header className="anim-rise">
        <div className="num mb-2 flex items-center gap-2 text-sm font-medium text-accent">
          <IconTrophy size={17} /> מבחן סיכום · נושא {index + 1}
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{quiz.title || `מבחן סיכום — ${topic.title}`}</h1>
        <p className="num mt-2 text-ink-2">
          מכסה את {lessonsOfTopic(data, topic.id).length} שיעורי הנושא · ציון עובר {stats.passing}%
          {data.course.lock_until_passed && next && " · מעבר המבחן פותח את ההמשך"}
        </p>
      </header>

      {gate.locked ? (
        <LockedCard data={data} gate={gate} />
      ) : (
        <Card className="p-5 sm:p-7" data-testid="exam-panel">
          <QuizPanel data={data} quiz={quiz} />
        </Card>
      )}
    </div>
  );
}
