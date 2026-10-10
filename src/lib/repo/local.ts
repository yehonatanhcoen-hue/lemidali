import type {
  Course,
  Lesson,
  LessonAttachment,
  LessonNote,
  LessonProgress,
  QuizAnswer,
  QuizAttempt,
  QuizQuestion,
  Topic,
} from "../types";
import { assemble } from "./assemble";
import { NotImplementedError, type Repository } from "./types";

/**
 * Browser-only fallback used when Supabase is not configured.
 * Same tables as the SQL schema, stored as one JSON blob in localStorage.
 */

const KEY = "lemidali:db:v1";

interface Db {
  courses: Course[];
  topics: Topic[];
  lessons: Lesson[];
  progress: LessonProgress[];
  questions: Omit<QuizQuestion, "answers">[];
  answers: QuizAnswer[];
  attempts: QuizAttempt[];
  notes: LessonNote[];
  attachments: LessonAttachment[];
}

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

/** Mirrors supabase/seed.sql — placeholder content only. */
function demoDb(): Db {
  const c = "00000000-0000-4000-8000-000000000001";
  const t1 = "00000000-0000-4000-8000-000000000101";
  const t2 = "00000000-0000-4000-8000-000000000102";
  const l1 = "00000000-0000-4000-8000-000000000201";
  const l2 = "00000000-0000-4000-8000-000000000202";
  const l3 = "00000000-0000-4000-8000-000000000203";
  const q1 = "00000000-0000-4000-8000-000000000301";
  const q2 = "00000000-0000-4000-8000-000000000302";
  const lesson = (id: string, topic_id: string, title: string, position: number, url: string | null): Lesson => ({
    id,
    topic_id,
    title,
    description: "Placeholder lesson description.",
    position,
    duration_minutes: 60,
    learning_url: url,
  });
  const answers = (qid: string, correct: number): QuizAnswer[] =>
    ["Answer A", "Answer B", "Answer C", "Answer D"].map((answer, i) => ({
      id: uid(),
      question_id: qid,
      answer,
      is_correct: i === correct,
      position: i,
    }));
  return {
    courses: [{ id: c, title: "My Learning Course", description: "Placeholder course description." }],
    topics: [
      { id: t1, course_id: c, title: "Topic 1", description: "Placeholder topic description.", position: 0 },
      { id: t2, course_id: c, title: "Topic 2", description: "Placeholder topic description.", position: 1 },
    ],
    lessons: [
      lesson(l1, t1, "Lesson 1", 0, "https://example.com"),
      lesson(l2, t1, "Lesson 2", 1, null),
      lesson(l3, t2, "Lesson 3", 0, null),
    ],
    progress: [],
    questions: [
      { id: q1, lesson_id: l1, question: "Placeholder question 1?", position: 0 },
      { id: q2, lesson_id: l1, question: "Placeholder question 2?", position: 1 },
    ],
    answers: [...answers(q1, 0), ...answers(q2, 2)],
    attempts: [],
    notes: [],
    attachments: [],
  };
}

function read(): Db {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    /* fall through to demo */
  }
  const db = demoDb();
  write(db);
  return db;
}

function write(db: Db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* storage unavailable (private mode) — state lives for this tab only */
  }
}

/** Run a mutation against the stored db and persist it. */
function tx(fn: (db: Db) => void) {
  const db = read();
  fn(db);
  write(db);
}

function removeLessonsCascade(db: Db, lessonIds: Set<string>) {
  const qIds = new Set(db.questions.filter((q) => lessonIds.has(q.lesson_id)).map((q) => q.id));
  db.lessons = db.lessons.filter((l) => !lessonIds.has(l.id));
  db.progress = db.progress.filter((p) => !lessonIds.has(p.lesson_id));
  db.questions = db.questions.filter((q) => !qIds.has(q.id));
  db.answers = db.answers.filter((a) => !qIds.has(a.question_id));
  db.attempts = db.attempts.filter((a) => !lessonIds.has(a.lesson_id));
  db.notes = db.notes.filter((n) => !lessonIds.has(n.lesson_id));
  db.attachments = db.attachments.filter((a) => !lessonIds.has(a.lesson_id));
}

const nextPos = (items: { position: number }[]) =>
  items.reduce((m, i) => Math.max(m, i.position + 1), 0);

export const localRepo: Repository = {
  mode: "local",

  async load() {
    const db = read();
    const course = db.courses[0];
    if (!course) return null;
    const topics = db.topics.filter((t) => t.course_id === course.id);
    const topicIds = new Set(topics.map((t) => t.id));
    return assemble({
      course,
      topics,
      lessons: db.lessons.filter((l) => topicIds.has(l.topic_id)),
      progress: db.progress,
      questions: db.questions,
      answers: db.answers,
      attempts: db.attempts,
      notes: db.notes,
      attachments: db.attachments,
    });
  },

  async createCourse(input) {
    tx((db) => db.courses.push({ id: uid(), ...input }));
  },
  async updateCourse(id, patch) {
    tx((db) => {
      db.courses = db.courses.map((c) => (c.id === id ? { ...c, ...patch } : c));
    });
  },

  async createTopic(courseId, input) {
    tx((db) =>
      db.topics.push({
        id: uid(),
        course_id: courseId,
        ...input,
        position: nextPos(db.topics.filter((t) => t.course_id === courseId)),
      }),
    );
  },
  async updateTopic(id, patch) {
    tx((db) => {
      db.topics = db.topics.map((t) => (t.id === id ? { ...t, ...patch } : t));
    });
  },
  async deleteTopic(id) {
    tx((db) => {
      removeLessonsCascade(db, new Set(db.lessons.filter((l) => l.topic_id === id).map((l) => l.id)));
      db.topics = db.topics.filter((t) => t.id !== id);
    });
  },
  async reorderTopics(ids) {
    tx((db) => {
      db.topics = db.topics.map((t) => (ids.includes(t.id) ? { ...t, position: ids.indexOf(t.id) } : t));
    });
  },

  async createLesson(topicId, input) {
    tx((db) =>
      db.lessons.push({
        id: uid(),
        ...input,
        topic_id: topicId,
        position: nextPos(db.lessons.filter((l) => l.topic_id === topicId)),
      }),
    );
  },
  async updateLesson(id, patch) {
    tx((db) => {
      db.lessons = db.lessons.map((l) => {
        if (l.id !== id) return l;
        const moved = patch.topic_id && patch.topic_id !== l.topic_id;
        return {
          ...l,
          ...patch,
          position: moved ? nextPos(db.lessons.filter((x) => x.topic_id === patch.topic_id)) : l.position,
        };
      });
    });
  },
  async deleteLesson(id) {
    tx((db) => removeLessonsCascade(db, new Set([id])));
  },
  async reorderLessons(ids) {
    tx((db) => {
      db.lessons = db.lessons.map((l) => (ids.includes(l.id) ? { ...l, position: ids.indexOf(l.id) } : l));
    });
  },

  async upsertProgress(lessonId, patch) {
    tx((db) => {
      const existing = db.progress.find((p) => p.lesson_id === lessonId);
      if (existing) Object.assign(existing, patch);
      else
        db.progress.push({
          lesson_id: lessonId,
          status: "not_started",
          material_completed: false,
          last_opened_at: null,
          completed_at: null,
          ...patch,
        });
    });
  },

  async saveQuestion(lessonId, input, id) {
    tx((db) => {
      let qid = id;
      if (qid) {
        db.questions = db.questions.map((q) => (q.id === qid ? { ...q, question: input.question } : q));
        db.answers = db.answers.filter((a) => a.question_id !== qid);
      } else {
        qid = uid();
        db.questions.push({
          id: qid,
          lesson_id: lessonId,
          question: input.question,
          position: nextPos(db.questions.filter((q) => q.lesson_id === lessonId)),
        });
      }
      input.answers.forEach((a, i) =>
        db.answers.push({ id: uid(), question_id: qid!, answer: a.answer, is_correct: a.is_correct, position: i }),
      );
    });
  },
  async deleteQuestion(id) {
    tx((db) => {
      db.questions = db.questions.filter((q) => q.id !== id);
      db.answers = db.answers.filter((a) => a.question_id !== id);
    });
  },

  async addQuizAttempt(lessonId, score, total) {
    tx((db) => db.attempts.push({ id: uid(), lesson_id: lessonId, score, total, completed_at: now() }));
  },

  async saveNote(lessonId, content) {
    const updated_at = now();
    tx((db) => {
      db.notes = db.notes.filter((n) => n.lesson_id !== lessonId);
      db.notes.push({ lesson_id: lessonId, content, updated_at });
    });
    return updated_at;
  },

  async uploadAttachment() {
    throw new NotImplementedError("File storage");
  },
  async deleteAttachment(id) {
    tx((db) => {
      db.attachments = db.attachments.filter((a) => a.id !== id);
    });
  },
};
