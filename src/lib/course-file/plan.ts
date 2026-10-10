import { ids, materialKey } from "../ids";
import type { ContentRows, CourseData, LessonMaterial, Quiz, QuizOption, QuizQuestionRow } from "../types";
import { FORMAT, VERSION, type CourseFile, type FileQuestion, type FileQuiz } from "./types";

export const DEFAULT_PASSING = 80;
export const DEFAULT_DURATION = 60;
export const TRUE_LABEL = "נכון";
export const FALSE_LABEL = "לא נכון";

/** Course file → database rows with deterministic ids. */
export function fileToRows(file: CourseFile): ContentRows {
  const ck = file.key;
  const course_id = ids.course(ck);
  const rows: ContentRows = {
    course: {
      id: course_id,
      key: ck,
      title: file.title.trim(),
      description: file.description?.trim() ?? "",
      passing_score: file.passing_score ?? DEFAULT_PASSING,
      lock_until_passed: file.lock_until_passed ?? true,
      is_active: true,
    },
    topics: [],
    lessons: [],
    materials: [],
    quizzes: [],
    questions: [],
    options: [],
  };

  const addQuiz = (quiz: Quiz, src: FileQuiz) => {
    rows.quizzes.push(quiz);
    src.questions.forEach((q, position) => {
      const id = ids.question(ck, q.key);
      rows.questions.push(questionRow(q, id, quiz.id, position));
      rows.options.push(...optionRows(q, id));
    });
  };

  file.topics.forEach((t, tPos) => {
    const topic_id = ids.topic(ck, t.key);
    rows.topics.push({
      id: topic_id,
      course_id,
      key: t.key,
      title: t.title.trim(),
      description: t.description?.trim() ?? "",
      position: tPos,
    });

    t.lessons.forEach((l, lPos) => {
      const lesson_id = ids.lesson(ck, l.key);
      rows.lessons.push({
        id: lesson_id,
        topic_id,
        key: l.key,
        title: l.title.trim(),
        description: l.description?.trim() ?? "",
        position: lPos,
        duration_minutes: l.duration_minutes ?? DEFAULT_DURATION,
      });

      const used = new Set<string>();
      (l.materials ?? []).forEach((m, mPos) => {
        let key = m.key ?? materialKey(l.key, m.url);
        for (let n = 2; used.has(key); n++) key = `${m.key ?? materialKey(l.key, m.url)}-${n}`;
        used.add(key);
        const row: LessonMaterial = {
          id: ids.material(ck, key),
          lesson_id,
          key,
          type: m.type,
          title: m.title.trim(),
          url: m.url.trim(),
          duration_minutes: m.duration_minutes ?? null,
          note: m.note?.trim() ?? "",
          position: mPos,
        };
        rows.materials.push(row);
      });

      if (l.quiz)
        addQuiz(
          { id: ids.lessonQuiz(ck, l.key), lesson_id, topic_id: null, title: "", passing_score: l.quiz.passing_score ?? null },
          l.quiz,
        );
    });

    if (t.final_exam)
      addQuiz(
        {
          id: ids.topicExam(ck, t.key),
          lesson_id: null,
          topic_id,
          title: t.final_exam.title?.trim() ?? "",
          passing_score: t.final_exam.passing_score ?? null,
        },
        t.final_exam,
      );
  });

  return rows;
}

function questionRow(q: FileQuestion, id: string, quiz_id: string, position: number): QuizQuestionRow {
  return {
    id,
    quiz_id,
    key: q.key,
    type: q.type,
    question: q.question.trim(),
    explanation: q.explanation?.trim() ?? "",
    model_answer: q.type === "open" ? q.model_answer.trim() : "",
    points: q.points ?? 1,
    position,
  };
}

function optionRows(q: FileQuestion, question_id: string): QuizOption[] {
  const make = (text: string, is_correct: boolean, position: number): QuizOption => ({
    id: ids.option(question_id, position),
    question_id,
    text,
    is_correct,
    position,
  });
  switch (q.type) {
    case "single":
      return q.options.map((t, i) => make(t.trim(), i === q.correct, i));
    case "multiple":
      return q.options.map((t, i) => make(t.trim(), q.correct.includes(i), i));
    case "true_false":
      return [make(TRUE_LABEL, q.correct === true, 0), make(FALSE_LABEL, q.correct === false, 1)];
    case "open":
      return [];
  }
}

/** Loaded course → course file (for export / editing outside the app). */
export function dataToFile(data: CourseData): CourseFile {
  const quizOf = (pred: (q: Quiz) => boolean) => data.quizzes.find(pred);
  const questionsOf = (quizId: string): FileQuestion[] =>
    data.questions
      .filter((q) => q.quiz_id === quizId)
      .map((q) => {
        const base = {
          key: q.key,
          question: q.question,
          ...(q.explanation ? { explanation: q.explanation } : {}),
          ...(q.points !== 1 ? { points: q.points } : {}),
        };
        const correctIdx = q.options.flatMap((o, i) => (o.is_correct ? [i] : []));
        switch (q.type) {
          case "single":
            return { ...base, type: "single", options: q.options.map((o) => o.text), correct: correctIdx[0] ?? 0 };
          case "multiple":
            return { ...base, type: "multiple", options: q.options.map((o) => o.text), correct: correctIdx };
          case "true_false":
            return { ...base, type: "true_false", correct: q.options[0]?.is_correct ?? true };
          case "open":
            return { ...base, type: "open", model_answer: q.model_answer };
        }
      });
  const quizFile = (quiz: Quiz | undefined) => {
    if (!quiz) return undefined;
    const questions = questionsOf(quiz.id);
    if (!questions.length) return undefined;
    return { ...(quiz.passing_score !== null ? { passing_score: quiz.passing_score } : {}), questions };
  };

  return {
    format: FORMAT,
    version: VERSION,
    key: data.course.key,
    title: data.course.title,
    ...(data.course.description ? { description: data.course.description } : {}),
    passing_score: data.course.passing_score,
    lock_until_passed: data.course.lock_until_passed,
    topics: data.topics.map((t) => {
      const exam = quizFile(quizOf((q) => q.topic_id === t.id));
      const examQuiz = quizOf((q) => q.topic_id === t.id);
      return {
        key: t.key,
        title: t.title,
        ...(t.description ? { description: t.description } : {}),
        lessons: data.lessons
          .filter((l) => l.topic_id === t.id)
          .map((l) => {
            const materials = data.materials
              .filter((m) => m.lesson_id === l.id)
              .map((m) => ({
                key: m.key,
                type: m.type,
                title: m.title,
                url: m.url,
                ...(m.duration_minutes ? { duration_minutes: m.duration_minutes } : {}),
                ...(m.note ? { note: m.note } : {}),
              }));
            const quiz = quizFile(quizOf((q) => q.lesson_id === l.id));
            return {
              key: l.key,
              title: l.title,
              ...(l.description ? { description: l.description } : {}),
              duration_minutes: l.duration_minutes,
              ...(materials.length ? { materials } : {}),
              ...(quiz ? { quiz } : {}),
            };
          }),
        ...(exam ? { final_exam: { ...(examQuiz?.title ? { title: examQuiz.title } : {}), ...exam } } : {}),
      };
    }),
  };
}
