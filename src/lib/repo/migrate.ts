import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabase } from "../supabase/client";
import { readLocalDb } from "./local";

/**
 * First login on a device that already has on-device data: copy it to the
 * account so nothing is lost. Runs once per user per device.
 *
 * Rules (the cloud always wins on conflict):
 * - courses not in the account are uploaded whole;
 * - courses already in the account are left as they are;
 * - progress, attempts, answers and notes are added where their lesson/quiz
 *   exists in the account; rows that already exist there are kept.
 * The on-device copy is not deleted.
 */

type Row = Record<string, unknown>;

const COLUMNS: Record<string, string[]> = {
  courses: ["id", "key", "title", "description", "passing_score", "lock_until_passed", "created_at", "updated_at"],
  topics: ["id", "course_id", "key", "title", "description", "position"],
  lessons: ["id", "topic_id", "key", "title", "description", "position", "duration_minutes"],
  lesson_materials: ["id", "lesson_id", "key", "type", "title", "url", "duration_minutes", "note", "position"],
  quizzes: ["id", "lesson_id", "topic_id", "title", "passing_score"],
  quiz_questions: ["id", "quiz_id", "key", "type", "question", "explanation", "model_answer", "points", "position"],
  quiz_options: ["id", "question_id", "text", "is_correct", "position"],
  lesson_progress: ["lesson_id", "status", "material_completed", "last_opened_at", "completed_at", "updated_at"],
  material_views: ["material_id", "viewed_at"],
  quiz_attempts: ["id", "quiz_id", "score", "total", "percent", "passed", "completed_at"],
  answer_log: ["id", "question_id", "attempt_id", "is_correct", "answered_at"],
  lesson_notes: ["lesson_id", "content", "updated_at"],
};
const PK: Record<string, string> = { lesson_progress: "lesson_id", material_views: "material_id", lesson_notes: "lesson_id" };

const flagKey = (userId: string) => `lemidali:migrated:${userId}`;

function pick(table: string, row: Row): Row {
  const out: Row = {};
  for (const c of COLUMNS[table]) if (row[c] !== undefined) out[c] = row[c];
  return out;
}

function check<T>(res: { data: T; error: PostgrestError | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

async function insertMissing(table: string, rows: Row[]) {
  const db = getSupabase();
  const clean = rows.map((r) => pick(table, r));
  for (let i = 0; i < clean.length; i += 500)
    check(
      await db.from(table).upsert(clean.slice(i, i + 500), { onConflict: PK[table] ?? "id", ignoreDuplicates: true }),
    );
}

async function ids(table: string, column = "id"): Promise<Set<string>> {
  const rows = check(await getSupabase().from(table).select(column)) as unknown as Row[];
  return new Set(rows.map((r) => r[column] as string));
}

/** Returns the number of courses copied (0 when there was nothing to do). */
export async function migrateLocalData(userId: string): Promise<number> {
  try {
    if (localStorage.getItem(flagKey(userId))) return 0;
  } catch {
    return 0;
  }
  const local = readLocalDb();
  const done = () => {
    try {
      localStorage.setItem(flagKey(userId), new Date().toISOString());
    } catch {}
  };
  if (!local.courses.length) {
    done();
    return 0;
  }

  const cloudCourses = check(await getSupabase().from("courses").select("id,is_active")) as { id: string; is_active: boolean }[];
  const inCloud = new Set(cloudCourses.map((c) => c.id));

  // 1) whole courses the account doesn't have yet
  const courses = local.courses.filter((c) => !inCloud.has(c.id as string));
  const courseIds = new Set(courses.map((c) => c.id));
  const topics = local.topics.filter((t) => courseIds.has(t.course_id));
  const topicIds = new Set(topics.map((t) => t.id));
  const lessons = local.lessons.filter((l) => topicIds.has(l.topic_id));
  const lessonIds = new Set(lessons.map((l) => l.id));
  const quizzes = local.quizzes.filter((q) => lessonIds.has(q.lesson_id) || topicIds.has(q.topic_id));
  const quizIds = new Set(quizzes.map((q) => q.id));
  const questions = local.quiz_questions.filter((q) => quizIds.has(q.quiz_id));
  const questionIds = new Set(questions.map((q) => q.id));

  await insertMissing("courses", courses);
  await insertMissing("topics", topics);
  await insertMissing("lessons", lessons);
  await insertMissing("lesson_materials", local.lesson_materials.filter((m) => lessonIds.has(m.lesson_id)));
  await insertMissing("quizzes", quizzes);
  await insertMissing("quiz_questions", questions);
  await insertMissing("quiz_options", local.quiz_options.filter((o) => questionIds.has(o.question_id)));

  // 2) learner state, wherever its content now exists in the account
  const [cLessons, cMaterials, cQuizzes, cQuestions] = await Promise.all([
    ids("lessons"),
    ids("lesson_materials"),
    ids("quizzes"),
    ids("quiz_questions"),
  ]);
  const has = (set: Set<string>, v: unknown) => typeof v === "string" && set.has(v);

  await insertMissing("lesson_progress", local.lesson_progress.filter((r) => has(cLessons, r.lesson_id)));
  await insertMissing("lesson_notes", local.lesson_notes.filter((r) => has(cLessons, r.lesson_id)));
  await insertMissing("material_views", local.material_views.filter((r) => has(cMaterials, r.material_id)));
  const attempts = local.quiz_attempts.filter((r) => has(cQuizzes, r.quiz_id));
  await insertMissing("quiz_attempts", attempts);
  const attemptIds = new Set(attempts.map((a) => a.id as string));
  await insertMissing(
    "answer_log",
    local.answer_log.filter((r) => has(cQuestions, r.question_id) && (r.attempt_id == null || has(attemptIds, r.attempt_id))),
  );

  // 3) keep the course you were on, unless the account already has an active one
  const localActive = local.courses.find((c) => c.is_active) ?? local.courses[0];
  if (!cloudCourses.some((c) => c.is_active) && localActive)
    check(await getSupabase().rpc("set_active_course", { course_id: localActive.id }));

  done();
  return courses.length;
}
