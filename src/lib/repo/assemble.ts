import type {
  Course,
  CourseData,
  LastResult,
  Lesson,
  LessonAttachment,
  LessonMaterial,
  LessonNote,
  LessonProgress,
  Quiz,
  QuizAttempt,
  QuizOption,
  QuizQuestionRow,
  Topic,
} from "../types";

const byPos = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

/** Normalizes raw rows (from any backend) into sorted CourseData. */
export function assemble(rows: {
  course: Course;
  topics: Topic[];
  lessons: Lesson[];
  materials: LessonMaterial[];
  quizzes: Quiz[];
  questions: QuizQuestionRow[];
  options: QuizOption[];
  progress: LessonProgress[];
  materialViews: { material_id: string; viewed_at: string }[];
  attempts: QuizAttempt[];
  lastResults: LastResult[];
  notes: LessonNote[];
  attachments: LessonAttachment[];
}): CourseData {
  const topics = rows.topics.filter((t) => t.course_id === rows.course.id).sort(byPos);
  const topicIndex = new Map(topics.map((t, i) => [t.id, i]));
  const lessons = rows.lessons
    .filter((l) => topicIndex.has(l.topic_id))
    .sort((a, b) => topicIndex.get(a.topic_id)! - topicIndex.get(b.topic_id)! || a.position - b.position);
  const lessonIds = new Set(lessons.map((l) => l.id));
  const topicIds = new Set(topics.map((t) => t.id));

  const quizzes = rows.quizzes.filter(
    (q) => (q.lesson_id && lessonIds.has(q.lesson_id)) || (q.topic_id && topicIds.has(q.topic_id)),
  );
  const quizIds = new Set(quizzes.map((q) => q.id));

  const optionsByQ = new Map<string, QuizOption[]>();
  for (const o of rows.options) {
    const list = optionsByQ.get(o.question_id) ?? [];
    list.push(o);
    optionsByQ.set(o.question_id, list);
  }
  const questions = rows.questions
    .filter((q) => quizIds.has(q.quiz_id))
    .sort(byPos)
    .map((q) => ({ ...q, options: (optionsByQ.get(q.id) ?? []).sort(byPos) }));
  const questionIds = new Set(questions.map((q) => q.id));

  const materials = rows.materials.filter((m) => lessonIds.has(m.lesson_id)).sort(byPos);
  const materialIds = new Set(materials.map((m) => m.id));

  return {
    course: rows.course,
    topics,
    lessons,
    materials,
    quizzes,
    questions,
    progress: Object.fromEntries(rows.progress.filter((p) => lessonIds.has(p.lesson_id)).map((p) => [p.lesson_id, p])),
    materialViews: Object.fromEntries(
      rows.materialViews.filter((v) => materialIds.has(v.material_id)).map((v) => [v.material_id, v.viewed_at]),
    ),
    attempts: rows.attempts
      .filter((a) => quizIds.has(a.quiz_id))
      .sort((a, b) => a.completed_at.localeCompare(b.completed_at)),
    lastResults: Object.fromEntries(
      rows.lastResults.filter((r) => questionIds.has(r.question_id)).map((r) => [r.question_id, r]),
    ),
    notes: Object.fromEntries(rows.notes.filter((n) => lessonIds.has(n.lesson_id)).map((n) => [n.lesson_id, n])),
    attachments: rows.attachments.filter((a) => lessonIds.has(a.lesson_id)),
  };
}
