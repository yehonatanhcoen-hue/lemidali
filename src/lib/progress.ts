import type { CourseData, Lesson, LessonProgress, LessonStatus, QuizQuestion, Topic } from "./types";

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

export const statusOf = (data: CourseData, lessonId: string): LessonStatus =>
  data.progress[lessonId]?.status ?? "not_started";

export const progressOf = (data: CourseData, lessonId: string): LessonProgress =>
  data.progress[lessonId] ?? {
    lesson_id: lessonId,
    status: "not_started",
    material_completed: false,
    last_opened_at: null,
    completed_at: null,
  };

export const lessonsOfTopic = (data: CourseData, topicId: string) =>
  data.lessons.filter((l) => l.topic_id === topicId);

/** Course-wide lesson number (1-based), following topic then lesson order. */
export const lessonNumber = (data: CourseData, lessonId: string) =>
  data.lessons.findIndex((l) => l.id === lessonId) + 1;

export function topicProgress(data: CourseData, topicId: string): Ratio {
  const lessons = lessonsOfTopic(data, topicId);
  return ratio(lessons.filter((l) => statusOf(data, l.id) === "completed").length, lessons.length);
}

export function courseProgress(data: CourseData): Ratio {
  return ratio(data.lessons.filter((l) => statusOf(data, l.id) === "completed").length, data.lessons.length);
}

/**
 * "Continue learning": the most recently opened in-progress lesson,
 * otherwise the first lesson (in course order) that is not completed.
 */
export function continueLesson(data: CourseData): Lesson | null {
  const inProgress = data.lessons
    .filter((l) => statusOf(data, l.id) === "in_progress")
    .sort((a, b) =>
      (data.progress[b.id]?.last_opened_at ?? "").localeCompare(data.progress[a.id]?.last_opened_at ?? ""),
    );
  return inProgress[0] ?? data.lessons.find((l) => statusOf(data, l.id) !== "completed") ?? null;
}

export const topicOf = (data: CourseData, lesson: Lesson): Topic | undefined =>
  data.topics.find((t) => t.id === lesson.topic_id);

export const questionsOf = (data: CourseData, lessonId: string): QuizQuestion[] =>
  data.questions.filter((q) => q.lesson_id === lessonId);

export function quizStats(data: CourseData, lessonId: string) {
  const attempts = data.attempts.filter((a) => a.lesson_id === lessonId);
  const pct = (a: { score: number; total: number }) => Math.round((a.score / a.total) * 100);
  const last = attempts.at(-1) ?? null;
  const best = attempts.reduce<(typeof attempts)[number] | null>(
    (b, a) => (!b || pct(a) > pct(b) ? a : b),
    null,
  );
  return {
    count: attempts.length,
    last: last && { ...last, percent: pct(last) },
    best: best && { ...best, percent: pct(best) },
  };
}

export type StepKey = "material" | "quiz" | "notes" | "complete";

export const STEPS: { key: StepKey; label: string }[] = [
  { key: "material", label: "חומר לימוד" },
  { key: "quiz", label: "מבחן" },
  { key: "notes", label: "סיכום" },
  { key: "complete", label: "השלמה" },
];

export function lessonSteps(data: CourseData, lessonId: string): Record<StepKey, boolean> {
  const p = progressOf(data, lessonId);
  const hasQuestions = questionsOf(data, lessonId).length > 0;
  return {
    material: p.material_completed,
    quiz: !hasQuestions || quizStats(data, lessonId).count > 0,
    notes: (data.notes[lessonId]?.content ?? "").trim().length > 0,
    complete: p.status === "completed",
  };
}

export const STATUS_LABEL: Record<LessonStatus, string> = {
  not_started: "לא התחיל",
  in_progress: "בתהליך",
  completed: "הושלם",
};
