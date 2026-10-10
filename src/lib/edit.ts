// Manual content editing (Manage page): builds rows with the same id scheme
// as the importer, so hand-made items survive export → re-import.

import { DEFAULT_DURATION, FALSE_LABEL, TRUE_LABEL } from "./course-file/plan";
import { ids, randomKey } from "./ids";
import type { Repository } from "./repo";
import type {
  Course,
  CourseData,
  Lesson,
  LessonMaterial,
  MaterialType,
  QuestionType,
  Quiz,
  QuizOption,
  QuizQuestion,
  Topic,
} from "./types";

const nextPos = (items: { position: number }[]) => items.reduce((m, i) => Math.max(m, i.position + 1), 0);

export async function createCourse(repo: Repository, input: { title: string; description: string }) {
  const key = randomKey("course");
  const course: Course = {
    id: ids.course(key),
    key,
    title: input.title,
    description: input.description,
    passing_score: 80,
    lock_until_passed: true,
    is_active: false,
  };
  await repo.upsert("courses", [course]);
  await repo.setActiveCourse(course.id);
}

export const updateCourse = (repo: Repository, course: Course, patch: Partial<Omit<Course, "id" | "key">>) =>
  repo.upsert("courses", [{ ...course, ...patch }]);

export async function createTopic(repo: Repository, data: CourseData, input: { title: string; description: string }) {
  const key = randomKey("topic");
  await repo.upsert("topics", [
    { id: ids.topic(data.course.key, key), course_id: data.course.id, key, ...input, position: nextPos(data.topics) },
  ]);
}

export const updateTopic = (repo: Repository, topic: Topic, patch: Partial<Pick<Topic, "title" | "description">>) =>
  repo.upsert("topics", [{ ...topic, ...patch }]);

export const reorder = <T extends { position: number }>(repo: Repository, table: "topics" | "lessons" | "lesson_materials", rows: T[]) =>
  repo.upsert(table, rows.map((r, position) => ({ ...r, position })) as never);

export interface LessonInput {
  title: string;
  description: string;
  duration_minutes: number;
  topic_id: string;
}

export async function saveLesson(repo: Repository, data: CourseData, input: LessonInput, existing?: Lesson) {
  const siblings = data.lessons.filter((l) => l.topic_id === input.topic_id && l.id !== existing?.id);
  if (existing) {
    const moved = existing.topic_id !== input.topic_id;
    await repo.upsert("lessons", [{ ...existing, ...input, position: moved ? nextPos(siblings) : existing.position }]);
    return;
  }
  const key = randomKey("lesson");
  await repo.upsert("lessons", [
    { id: ids.lesson(data.course.key, key), key, ...input, duration_minutes: input.duration_minutes || DEFAULT_DURATION, position: nextPos(siblings) },
  ]);
}

export interface MaterialInput {
  type: MaterialType;
  title: string;
  url: string;
  duration_minutes: number | null;
  note: string;
}

export async function saveMaterial(
  repo: Repository,
  data: CourseData,
  lessonId: string,
  input: MaterialInput,
  existing?: LessonMaterial,
) {
  if (existing) return repo.upsert("lesson_materials", [{ ...existing, ...input }]);
  const key = randomKey("m");
  const row: LessonMaterial = {
    id: ids.material(data.course.key, key),
    lesson_id: lessonId,
    key,
    ...input,
    position: nextPos(data.materials.filter((m) => m.lesson_id === lessonId)),
  };
  await repo.upsert("lesson_materials", [row]);
}

export interface QuestionInput {
  type: QuestionType;
  question: string;
  explanation: string;
  model_answer: string;
  points: number;
  /** single/multiple: option texts; true_false: ignored */
  options: { text: string; is_correct: boolean }[];
  /** true_false only */
  tfCorrect?: boolean;
}

export type QuizOwner = { lessonId: string } | { topicId: string };

/** Finds the lesson quiz / topic exam, creating it if needed. */
async function ensureQuiz(repo: Repository, data: CourseData, owner: QuizOwner): Promise<Quiz> {
  const ck = data.course.key;
  if ("lessonId" in owner) {
    const found = data.quizzes.find((q) => q.lesson_id === owner.lessonId);
    if (found) return found;
    const lesson = data.lessons.find((l) => l.id === owner.lessonId)!;
    const quiz: Quiz = { id: ids.lessonQuiz(ck, lesson.key), lesson_id: lesson.id, topic_id: null, title: "", passing_score: null };
    await repo.upsert("quizzes", [quiz]);
    return quiz;
  }
  const found = data.quizzes.find((q) => q.topic_id === owner.topicId);
  if (found) return found;
  const topic = data.topics.find((t) => t.id === owner.topicId)!;
  const quiz: Quiz = { id: ids.topicExam(ck, topic.key), lesson_id: null, topic_id: topic.id, title: "", passing_score: null };
  await repo.upsert("quizzes", [quiz]);
  return quiz;
}

export async function saveQuestion(
  repo: Repository,
  data: CourseData,
  owner: QuizOwner,
  input: QuestionInput,
  existing?: QuizQuestion,
) {
  const quiz = await ensureQuiz(repo, data, owner);
  const key = existing?.key ?? randomKey("q");
  const id = existing?.id ?? ids.question(data.course.key, key);
  await repo.upsert("quiz_questions", [
    {
      id,
      quiz_id: quiz.id,
      key,
      type: input.type,
      question: input.question,
      explanation: input.explanation,
      model_answer: input.type === "open" ? input.model_answer : "",
      points: input.points,
      position: existing?.position ?? nextPos(data.questions.filter((q) => q.quiz_id === quiz.id)),
    },
  ]);
  const texts =
    input.type === "open"
      ? []
      : input.type === "true_false"
        ? [
            { text: TRUE_LABEL, is_correct: input.tfCorrect === true },
            { text: FALSE_LABEL, is_correct: input.tfCorrect === false },
          ]
        : input.options;
  const options: QuizOption[] = texts.map((o, position) => ({ id: ids.option(id, position), question_id: id, ...o, position }));
  const stale = (existing?.options ?? []).filter((o) => !options.some((n) => n.id === o.id)).map((o) => o.id);
  if (stale.length) await repo.remove("quiz_options", stale);
  if (options.length) await repo.upsert("quiz_options", options);
}
