import { newId } from "../ids";
import type { ContentRows, CourseSummary, LastResult } from "../types";
import { assemble } from "./assemble";
import { NotImplementedError, type Repository } from "./types";

/**
 * Browser-only fallback used when Supabase is not configured.
 * Same tables as the SQL schema, stored as one JSON blob in localStorage.
 */

const KEY = "lemidali:db:v2";

type Row = Record<string, unknown>;
type Db = Record<string, Row[]>;

const TABLES = [
  "courses", "topics", "lessons", "lesson_materials", "quizzes", "quiz_questions", "quiz_options",
  "lesson_progress", "material_views", "quiz_attempts", "answer_log", "lesson_notes", "lesson_attachments",
] as const;

const PK: Record<string, string> = { lesson_progress: "lesson_id", material_views: "material_id", lesson_notes: "lesson_id" };
const pk = (table: string) => PK[table] ?? "id";

// [child table, fk column, parent table] — mirrors "on delete cascade" in SQL
const RELATIONS: [string, string, string][] = [
  ["topics", "course_id", "courses"],
  ["lessons", "topic_id", "topics"],
  ["lesson_materials", "lesson_id", "lessons"],
  ["quizzes", "lesson_id", "lessons"],
  ["quizzes", "topic_id", "topics"],
  ["quiz_questions", "quiz_id", "quizzes"],
  ["quiz_options", "question_id", "quiz_questions"],
  ["lesson_progress", "lesson_id", "lessons"],
  ["material_views", "material_id", "lesson_materials"],
  ["quiz_attempts", "quiz_id", "quizzes"],
  ["answer_log", "question_id", "quiz_questions"],
  ["answer_log", "attempt_id", "quiz_attempts"],
  ["lesson_notes", "lesson_id", "lessons"],
  ["lesson_attachments", "lesson_id", "lessons"],
];

const now = () => new Date().toISOString();

function read(): Db {
  let db: Db = {};
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) db = JSON.parse(raw) as Db;
  } catch {
    /* start empty */
  }
  for (const t of TABLES) db[t] ??= [];
  return db;
}

function write(db: Db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    throw new Error(`שמירה בדפדפן נכשלה (${e instanceof Error ? e.message : e})`);
  }
}

function tx<T>(fn: (db: Db) => T): T {
  const db = read();
  const out = fn(db);
  write(db);
  return out;
}

function upsertRows(db: Db, table: string, rows: Row[]) {
  const key = pk(table);
  const index = new Map(db[table].map((r, i) => [r[key], i]));
  for (const row of rows) {
    const i = index.get(row[key]);
    if (i === undefined) {
      index.set(row[key], db[table].length);
      db[table].push({ ...row });
    } else db[table][i] = { ...db[table][i], ...row };
  }
}

function cascadeDelete(db: Db, table: string, keys: Set<unknown>) {
  if (!keys.size) return;
  const key = pk(table);
  db[table] = db[table].filter((r) => !keys.has(r[key]));
  for (const [child, fk, parent] of RELATIONS) {
    if (parent !== table) continue;
    const doomed = new Set(db[child].filter((r) => keys.has(r[fk])).map((r) => r[pk(child)]));
    cascadeDelete(db, child, doomed);
  }
}

function lastResults(db: Db): LastResult[] {
  const latest = new Map<string, LastResult>();
  for (const r of db.answer_log as unknown as (LastResult & { answered_at: string })[]) {
    const prev = latest.get(r.question_id);
    if (!prev || r.answered_at >= prev.answered_at)
      latest.set(r.question_id, { question_id: r.question_id, is_correct: r.is_correct, answered_at: r.answered_at });
  }
  return [...latest.values()];
}

export const localRepo: Repository = {
  mode: "local",

  async listCourses() {
    return read().courses.map(({ id, key, title, is_active }) => ({ id, key, title, is_active }) as CourseSummary);
  },

  async load(courseId) {
    const db = read();
    const course = (courseId
      ? db.courses.find((c) => c.id === courseId)
      : db.courses.find((c) => c.is_active) ?? db.courses[0]) as unknown as ContentRows["course"] | undefined;
    if (!course) return null;
    return assemble({
      course,
      topics: db.topics as never,
      lessons: db.lessons as never,
      materials: db.lesson_materials as never,
      quizzes: db.quizzes as never,
      questions: db.quiz_questions as never,
      options: db.quiz_options as never,
      progress: db.lesson_progress as never,
      materialViews: db.material_views as never,
      attempts: db.quiz_attempts as never,
      lastResults: lastResults(db),
      notes: db.lesson_notes as never,
      attachments: db.lesson_attachments as never,
    });
  },

  async setActiveCourse(id) {
    tx((db) => {
      db.courses = db.courses.map((c) => ({ ...c, is_active: c.id === id }));
    });
  },

  async upsert(table, rows) {
    tx((db) => upsertRows(db, table, rows as unknown as Row[]));
  },

  async remove(table, ids) {
    tx((db) => cascadeDelete(db, table, new Set(ids)));
  },

  async importCourse(rows) {
    tx((db) => {
      const cid = rows.course.id;
      db.courses = db.courses.map((c) => ({ ...c, is_active: false }));
      upsertRows(db, "courses", [rows.course as unknown as Row]);

      // prune: rows of this course that the file no longer contains
      const keep = (list: { id: string }[]) => new Set(list.map((r) => r.id));
      const prune = (table: string, inScope: (r: Row) => boolean, keepIds: Set<string>) =>
        cascadeDelete(db, table, new Set(db[table].filter((r) => inScope(r) && !keepIds.has(r.id as string)).map((r) => r.id)));

      const oldTopicIds = new Set(db.topics.filter((t) => t.course_id === cid).map((t) => t.id));
      prune("topics", (t) => t.course_id === cid, keep(rows.topics));

      const topicIds = new Set<unknown>([...oldTopicIds, ...rows.topics.map((t) => t.id)]);
      prune("lessons", (l) => topicIds.has(l.topic_id), keep(rows.lessons));

      const lessonIds = new Set<unknown>([
        ...db.lessons.filter((l) => topicIds.has(l.topic_id)).map((l) => l.id),
        ...rows.lessons.map((l) => l.id),
      ]);
      prune("lesson_materials", (m) => lessonIds.has(m.lesson_id), keep(rows.materials));
      prune("quizzes", (q) => lessonIds.has(q.lesson_id) || topicIds.has(q.topic_id), keep(rows.quizzes));

      const quizIds = new Set<unknown>([
        ...db.quizzes.filter((q) => lessonIds.has(q.lesson_id) || topicIds.has(q.topic_id)).map((q) => q.id),
        ...rows.quizzes.map((q) => q.id),
      ]);
      prune("quiz_questions", (q) => quizIds.has(q.quiz_id), keep(rows.questions));
      const questionIds = new Set<unknown>(rows.questions.map((q) => q.id));
      prune("quiz_options", (o) => questionIds.has(o.question_id), keep(rows.options));

      upsertRows(db, "topics", rows.topics as unknown as Row[]);
      upsertRows(db, "lessons", rows.lessons as unknown as Row[]);
      upsertRows(db, "lesson_materials", rows.materials as unknown as Row[]);
      upsertRows(db, "quizzes", rows.quizzes as unknown as Row[]);
      upsertRows(db, "quiz_questions", rows.questions as unknown as Row[]);
      upsertRows(db, "quiz_options", rows.options as unknown as Row[]);
    });
  },

  async upsertProgress(lessonId, patch) {
    tx((db) => {
      const existing = db.lesson_progress.find((p) => p.lesson_id === lessonId);
      if (existing) Object.assign(existing, patch);
      else
        db.lesson_progress.push({
          lesson_id: lessonId,
          status: "not_started",
          material_completed: false,
          last_opened_at: null,
          completed_at: null,
          ...patch,
        });
    });
  },

  async setMaterialViewed(materialId, viewed) {
    tx((db) => {
      db.material_views = db.material_views.filter((v) => v.material_id !== materialId);
      if (viewed) db.material_views.push({ material_id: materialId, viewed_at: now() });
    });
  },

  async recordAttempt(quizId, result, answers) {
    tx((db) => {
      const id = newId();
      const at = now();
      db.quiz_attempts.push({ id, quiz_id: quizId, ...result, completed_at: at });
      for (const a of answers) db.answer_log.push({ id: newId(), ...a, attempt_id: id, answered_at: at });
    });
  },

  async logAnswers(answers) {
    tx((db) => {
      const at = now();
      for (const a of answers) db.answer_log.push({ id: newId(), ...a, attempt_id: null, answered_at: at });
    });
  },

  async saveNote(lessonId, content) {
    const updated_at = now();
    tx((db) => {
      db.lesson_notes = db.lesson_notes.filter((n) => n.lesson_id !== lessonId);
      db.lesson_notes.push({ lesson_id: lessonId, content, updated_at });
    });
    return updated_at;
  },

  async uploadAttachment() {
    throw new NotImplementedError("File storage");
  },
  async deleteAttachment(id) {
    tx((db) => cascadeDelete(db, "lesson_attachments", new Set([id])));
  },
};
