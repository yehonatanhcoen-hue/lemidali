import type { ContentRows, CourseData } from "../types";

export interface ImportPreview {
  isNew: boolean;
  title: string;
  counts: { topics: number; lessons: number; materials: number; questions: number; exams: number; minutes: number };
  added: { topics: number; lessons: number; questions: number };
  updatedLessons: number;
  removed: {
    topics: string[];
    lessons: { title: string; hasProgress: boolean }[];
    questions: number;
    materials: number;
  };
  /** removed items that carry learner state (progress, scores, notes) */
  losesProgress: boolean;
}

/** What importing `rows` would do to the course as it is now (`current` = same course, or null). */
export function previewImport(rows: ContentRows, current: CourseData | null): ImportPreview {
  const has = <T extends { id: string }>(list: T[]) => new Set(list.map((x) => x.id));
  const newTopics = has(rows.topics);
  const newLessons = has(rows.lessons);
  const newQuestions = has(rows.questions);
  const newMaterials = has(rows.materials);

  const oldTopics = current ? has(current.topics) : new Set<string>();
  const oldLessons = current ? has(current.lessons) : new Set<string>();
  const oldQuestions = current ? has(current.questions) : new Set<string>();

  const lessonHasProgress = (id: string) => {
    if (!current) return false;
    const p = current.progress[id];
    const quizIds = current.quizzes.filter((q) => q.lesson_id === id).map((q) => q.id);
    return Boolean(
      (p && p.status !== "not_started") ||
        current.notes[id]?.content.trim() ||
        current.attempts.some((a) => quizIds.includes(a.quiz_id)),
    );
  };

  const removedLessons = (current?.lessons ?? [])
    .filter((l) => !newLessons.has(l.id))
    .map((l) => ({ title: l.title, hasProgress: lessonHasProgress(l.id) }));

  const removedQuestions = (current?.questions ?? []).filter((q) => !newQuestions.has(q.id));
  const removedTopicExamAttempts = current
    ? current.quizzes
        .filter((q) => q.topic_id && !newTopics.has(q.topic_id))
        .some((q) => current.attempts.some((a) => a.quiz_id === q.id))
    : false;

  return {
    isNew: !current,
    title: rows.course.title,
    counts: {
      topics: rows.topics.length,
      lessons: rows.lessons.length,
      materials: rows.materials.length,
      questions: rows.questions.length,
      exams: rows.quizzes.filter((q) => q.topic_id).length,
      minutes: rows.lessons.reduce((s, l) => s + l.duration_minutes, 0),
    },
    added: {
      topics: rows.topics.filter((t) => !oldTopics.has(t.id)).length,
      lessons: rows.lessons.filter((l) => !oldLessons.has(l.id)).length,
      questions: rows.questions.filter((q) => !oldQuestions.has(q.id)).length,
    },
    updatedLessons: rows.lessons.filter((l) => oldLessons.has(l.id)).length,
    removed: {
      topics: (current?.topics ?? []).filter((t) => !newTopics.has(t.id)).map((t) => t.title),
      lessons: removedLessons,
      questions: removedQuestions.length,
      materials: (current?.materials ?? []).filter((m) => !newMaterials.has(m.id)).length,
    },
    losesProgress:
      removedLessons.some((l) => l.hasProgress) ||
      removedQuestions.some((q) => current?.lastResults[q.id]) ||
      removedTopicExamAttempts,
  };
}
