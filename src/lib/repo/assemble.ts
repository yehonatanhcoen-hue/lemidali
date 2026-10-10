import type {
  Course,
  CourseData,
  Lesson,
  LessonAttachment,
  LessonNote,
  LessonProgress,
  QuizAnswer,
  QuizAttempt,
  QuizQuestion,
  Topic,
} from "../types";

type RawQuestion = Omit<QuizQuestion, "answers">;

const byPos = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

/** Normalizes raw rows (from any backend) into sorted CourseData. */
export function assemble(rows: {
  course: Course;
  topics: Topic[];
  lessons: Lesson[];
  progress: LessonProgress[];
  questions: RawQuestion[];
  answers: QuizAnswer[];
  attempts: QuizAttempt[];
  notes: LessonNote[];
  attachments: LessonAttachment[];
}): CourseData {
  const topics = [...rows.topics].sort(byPos);
  const topicIndex = new Map(topics.map((t, i) => [t.id, i]));
  const lessons = rows.lessons
    .filter((l) => topicIndex.has(l.topic_id))
    .sort(
      (a, b) =>
        topicIndex.get(a.topic_id)! - topicIndex.get(b.topic_id)! || a.position - b.position,
    );
  const lessonIds = new Set(lessons.map((l) => l.id));

  const answersByQ = new Map<string, QuizAnswer[]>();
  for (const a of rows.answers) {
    const list = answersByQ.get(a.question_id) ?? [];
    list.push(a);
    answersByQ.set(a.question_id, list);
  }

  return {
    course: rows.course,
    topics,
    lessons,
    progress: Object.fromEntries(
      rows.progress.filter((p) => lessonIds.has(p.lesson_id)).map((p) => [p.lesson_id, p]),
    ),
    questions: rows.questions
      .filter((q) => lessonIds.has(q.lesson_id))
      .sort(byPos)
      .map((q) => ({ ...q, answers: (answersByQ.get(q.id) ?? []).sort(byPos) })),
    attempts: rows.attempts
      .filter((a) => lessonIds.has(a.lesson_id))
      .sort((a, b) => a.completed_at.localeCompare(b.completed_at)),
    notes: Object.fromEntries(
      rows.notes.filter((n) => lessonIds.has(n.lesson_id)).map((n) => [n.lesson_id, n]),
    ),
    attachments: rows.attachments.filter((a) => lessonIds.has(a.lesson_id)),
  };
}
