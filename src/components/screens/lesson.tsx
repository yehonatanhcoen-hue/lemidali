"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { lessonNumber, lessonSteps, progressOf, questionsOf, topicOf } from "@/lib/progress";
import { useCourse } from "@/lib/store";
import type { CourseData } from "@/lib/types";
import { WithData } from "../app-shell";
import { IconClock } from "../icons";
import { CompleteSection } from "../lesson/complete";
import { MaterialSection } from "../lesson/material";
import { NotesSection } from "../lesson/notes";
import { QuizSection } from "../lesson/quiz";
import { Section } from "../lesson/section";
import { Stepper } from "../lesson/stepper";
import { Card, Empty, StatusBadge } from "../ui";

export function LessonScreen() {
  const { lessonId } = useParams<{ lessonId: string }>();
  return <WithData>{(data) => <LessonView key={lessonId} data={data} lessonId={lessonId} />}</WithData>;
}

/** Opening a lesson records it as the place to "continue" from. */
function useTrackVisit(data: CourseData, lessonId: string, exists: boolean) {
  const { actions } = useCourse();
  const done = useRef(false);
  useEffect(() => {
    if (!exists || done.current) return;
    done.current = true;
    const p = progressOf(data, lessonId);
    void actions.upsertProgress(lessonId, {
      last_opened_at: new Date().toISOString(),
      ...(p.status === "not_started" ? { status: "in_progress" } : {}),
    });
  }, [actions, data, lessonId, exists]);
}

function LessonView({ data, lessonId }: { data: CourseData; lessonId: string }) {
  const lesson = data.lessons.find((l) => l.id === lessonId);
  useTrackVisit(data, lessonId, Boolean(lesson));

  if (!lesson)
    return (
      <Empty title="השיעור לא נמצא">
        <Link href="/course" className="text-accent">
          חזרה לקורס
        </Link>
      </Empty>
    );

  const topic = topicOf(data, lesson);
  const topicIndex = data.topics.findIndex((t) => t.id === lesson.topic_id);
  const num = lessonNumber(data, lesson.id);
  const progress = progressOf(data, lesson.id);
  const steps = lessonSteps(data, lesson.id);
  const questions = questionsOf(data, lesson.id);
  const note = data.notes[lesson.id];
  const nextLesson = data.lessons[num] ?? null; // num is 1-based → index of the following lesson

  return (
    <div className="space-y-6">
      <nav className="num flex flex-wrap items-center gap-x-2 text-sm text-muted anim-rise">
        <Link href="/course" className="hover:text-ink">
          {data.course.title}
        </Link>
        <span>/</span>
        {topic && (
          <>
            <Link href={`/topics/${topic.id}`} className="hover:text-ink">
              {topic.title}
            </Link>
            <span>/</span>
          </>
        )}
        <span>שיעור {num}</span>
      </nav>

      {/* Part A — lesson info */}
      <header className="anim-rise" data-testid="lesson-header">
        <div className="num mb-2 text-sm font-medium text-accent">
          שיעור {num}
          {topic && <span className="text-muted"> · נושא {topicIndex + 1}: {topic.title}</span>}
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{lesson.title}</h1>
        {lesson.description && <p className="mt-2 max-w-2xl text-ink-2">{lesson.description}</p>}
        <div className="num mt-4 flex flex-wrap items-center gap-3 text-sm text-ink-2">
          <StatusBadge status={progress.status} />
          <span className="flex items-center gap-1.5">
            <IconClock size={16} className="text-muted" />
            משך מתוכנן: {lesson.duration_minutes} דקות
          </span>
        </div>
      </header>

      <Card className="sticky top-[61px] z-10 px-3 py-4 sm:px-6 md:top-4">
        <Stepper done={steps} />
      </Card>

      <Section id="material" step={1} title="חומר לימוד" done={steps.material}>
        <MaterialSection lesson={lesson} progress={progress} />
      </Section>

      <Section
        id="quiz"
        step={2}
        title="מבחן"
        done={steps.quiz && questions.length > 0}
        locked={!steps.material}
        lockedText="השלב הבא אחרי סימון ״השלמתי את חומר הלימוד״"
      >
        <QuizSection data={data} lessonId={lesson.id} questions={questions} />
      </Section>

      <Section
        id="notes"
        step={3}
        title="הסיכום שלי"
        done={steps.notes}
        locked={!steps.material || !steps.quiz}
        lockedText="מומלץ לכתוב את הסיכום אחרי המבחן"
      >
        <NotesSection
          lessonId={lesson.id}
          initial={note?.content ?? ""}
          updatedAt={note?.updated_at ?? null}
          attachments={data.attachments.filter((a) => a.lesson_id === lesson.id)}
        />
      </Section>

      <Section id="complete" step={4} title="השלמת השיעור" done={steps.complete}>
        <CompleteSection data={data} lesson={lesson} steps={steps} nextLesson={nextLesson} />
      </Section>
    </div>
  );
}
