import type {
  CourseData,
  Lesson,
  LessonMaterial,
  LessonProgress,
  LessonStatus,
  Quiz,
  QuizAttempt,
  QuizQuestion,
  Topic,
} from "./types";
import { routes } from "./routes";

export interface Ratio {
  completed: number;
  total: number;
  percent: number;
}

export const ratio = (completed: number, total: number): Ratio => ({
  completed,
  total,
  percent: total ? Math.round((completed / total) * 100) : 0,
});

/* ---------- lessons ---------- */

export const progressOf = (data: CourseData, lessonId: string): LessonProgress =>
  data.progress[lessonId] ?? {
    lesson_id: lessonId,
    status: "not_started",
    material_completed: false,
    last_opened_at: null,
    completed_at: null,
  };

export const statusOf = (data: CourseData, lessonId: string): LessonStatus => progressOf(data, lessonId).status;

export const lessonsOfTopic = (data: CourseData, topicId: string) => data.lessons.filter((l) => l.topic_id === topicId);

/** Course-wide lesson number (1-based), following topic then lesson order. */
export const lessonNumber = (data: CourseData, lessonId: string) => data.lessons.findIndex((l) => l.id === lessonId) + 1;

export const topicOf = (data: CourseData, lesson: Lesson): Topic | undefined =>
  data.topics.find((t) => t.id === lesson.topic_id);

export const materialsOf = (data: CourseData, lessonId: string): LessonMaterial[] =>
  data.materials.filter((m) => m.lesson_id === lessonId);

export function topicProgress(data: CourseData, topicId: string): Ratio {
  const lessons = lessonsOfTopic(data, topicId);
  return ratio(lessons.filter((l) => statusOf(data, l.id) === "completed").length, lessons.length);
}

export function courseProgress(data: CourseData): Ratio {
  return ratio(data.lessons.filter((l) => statusOf(data, l.id) === "completed").length, data.lessons.length);
}

/* ---------- quizzes ---------- */

export const lessonQuiz = (data: CourseData, lessonId: string): Quiz | undefined =>
  data.quizzes.find((q) => q.lesson_id === lessonId);

export const topicExam = (data: CourseData, topicId: string): Quiz | undefined =>
  data.quizzes.find((q) => q.topic_id === topicId);

export const questionsOf = (data: CourseData, quizId: string | undefined): QuizQuestion[] =>
  quizId ? data.questions.filter((q) => q.quiz_id === quizId) : [];

export const passingScore = (data: CourseData, quiz: Quiz) => quiz.passing_score ?? data.course.passing_score;

export interface QuizStats {
  count: number;
  last: QuizAttempt | null;
  best: QuizAttempt | null;
  passing: number;
  passed: boolean;
  hasQuestions: boolean;
}

export function quizStats(data: CourseData, quiz: Quiz | undefined): QuizStats {
  if (!quiz) return { count: 0, last: null, best: null, passing: data.course.passing_score, passed: true, hasQuestions: false };
  const attempts = data.attempts.filter((a) => a.quiz_id === quiz.id);
  const best = attempts.reduce<QuizAttempt | null>((b, a) => (!b || a.percent > b.percent ? a : b), null);
  const passing = passingScore(data, quiz);
  const hasQuestions = questionsOf(data, quiz.id).length > 0;
  return {
    count: attempts.length,
    last: attempts.at(-1) ?? null,
    best,
    passing,
    // a quiz with no questions never blocks
    passed: !hasQuestions || Boolean(best && best.percent >= passing),
    hasQuestions,
  };
}

/* ---------- course sequence & locks ---------- */

export type SeqItem =
  | { kind: "lesson"; id: string; lesson: Lesson; quiz?: Quiz }
  | { kind: "exam"; id: string; topic: Topic; quiz: Quiz };

export interface Gate {
  locked: boolean;
  /** first earlier item whose quiz isn't passed yet */
  blocker: SeqItem | null;
}

/** Lessons and topic exams in learning order. */
export function sequence(data: CourseData): SeqItem[] {
  const out: SeqItem[] = [];
  for (const topic of data.topics) {
    for (const lesson of lessonsOfTopic(data, topic.id))
      out.push({ kind: "lesson", id: lesson.id, lesson, quiz: lessonQuiz(data, lesson.id) });
    const exam = topicExam(data, topic.id);
    if (exam && questionsOf(data, exam.id).length) out.push({ kind: "exam", id: exam.id, topic, quiz: exam });
  }
  return out;
}

/**
 * Lock rule (when the course has lock_until_passed): an item is locked while
 * any earlier quiz — lesson quiz or topic exam — has not been passed.
 */
export function gates(data: CourseData): Map<string, Gate> {
  const map = new Map<string, Gate>();
  let blocker: SeqItem | null = null;
  for (const item of sequence(data)) {
    map.set(item.id, { locked: data.course.lock_until_passed && blocker !== null, blocker });
    if (!blocker && !quizStats(data, item.quiz).passed) blocker = item;
  }
  return map;
}

export const gateOf = (data: CourseData, id: string): Gate => gates(data).get(id) ?? { locked: false, blocker: null };

/** Wraps user text so mixed Hebrew/English renders in the right order (Unicode isolate). */
export const iso = (text: string) => `\u2068${text}\u2069`;

export const itemTitle = (data: CourseData, item: SeqItem) =>
  item.kind === "lesson" ? `שיעור ${lessonNumber(data, item.lesson.id)}: ${iso(item.lesson.title)}` : `מבחן סיכום — ${iso(item.topic.title)}`;

export const itemHref = (item: SeqItem) =>
  item.kind === "lesson" ? routes.lesson(item.lesson.id) : routes.exam(item.topic.id);

/**
 * "Continue learning": the most recently opened unlocked lesson that is in
 * progress; otherwise the first unlocked item not finished yet (lesson not
 * completed or its quiz not passed; exam not passed).
 */
export function continueItem(data: CourseData): SeqItem | null {
  const g = gates(data);
  const items = sequence(data).filter((i) => !g.get(i.id)?.locked);
  const unfinished = (i: SeqItem) =>
    i.kind === "lesson" ? statusOf(data, i.id) !== "completed" || !quizStats(data, i.quiz).passed : !quizStats(data, i.quiz).passed;
  const inProgress = items
    .filter((i): i is Extract<SeqItem, { kind: "lesson" }> => i.kind === "lesson" && statusOf(data, i.id) === "in_progress")
    .sort((a, b) => (data.progress[b.id]?.last_opened_at ?? "").localeCompare(data.progress[a.id]?.last_opened_at ?? ""));
  return inProgress[0] ?? items.find(unfinished) ?? null;
}

/* ---------- lesson steps ---------- */

export type StepKey = "material" | "quiz" | "notes" | "complete";

export const STEPS: { key: StepKey; label: string }[] = [
  { key: "material", label: "חומר לימוד" },
  { key: "quiz", label: "מבחן" },
  { key: "notes", label: "סיכום" },
  { key: "complete", label: "השלמה" },
];

export function lessonSteps(data: CourseData, lessonId: string): Record<StepKey, boolean> {
  const p = progressOf(data, lessonId);
  return {
    material: p.material_completed,
    quiz: quizStats(data, lessonQuiz(data, lessonId)).passed,
    notes: (data.notes[lessonId]?.content ?? "").trim().length > 0,
    complete: p.status === "completed",
  };
}

/* ---------- mistakes ---------- */

/** Questions whose most recent answer was wrong. */
export function mistakes(data: CourseData, quizId?: string): QuizQuestion[] {
  const order = new Map(sequence(data).map((item, i) => [item.quiz?.id, i]));
  return data.questions
    .filter((q) => (!quizId || q.quiz_id === quizId) && data.lastResults[q.id]?.is_correct === false)
    .sort((a, b) => (order.get(a.quiz_id) ?? 0) - (order.get(b.quiz_id) ?? 0) || a.position - b.position);
}

/** Where a question lives, for labels ("שיעור 3: …" / "מבחן סיכום — …"). */
export function questionSource(data: CourseData, q: QuizQuestion): { label: string; href: string } {
  const quiz = data.quizzes.find((z) => z.id === q.quiz_id);
  const lesson = quiz?.lesson_id ? data.lessons.find((l) => l.id === quiz.lesson_id) : undefined;
  if (lesson) return { label: `שיעור ${lessonNumber(data, lesson.id)}: ${iso(lesson.title)}`, href: routes.lesson(lesson.id) };
  const topic = quiz?.topic_id ? data.topics.find((t) => t.id === quiz.topic_id) : undefined;
  return { label: topic ? `מבחן סיכום — ${iso(topic.title)}` : "", href: topic ? routes.exam(topic.id) : "/" };
}

export const STATUS_LABEL: Record<LessonStatus, string> = {
  not_started: "לא התחיל",
  in_progress: "בתהליך",
  completed: "הושלם",
};
