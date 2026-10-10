import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabase } from "../supabase/client";
import type { ContentTable, Course, CourseSummary } from "../types";
import { assemble } from "./assemble";
import { NotImplementedError, type Repository } from "./types";

const db = () => getSupabase();

function check<T>(res: { data: T; error: PostgrestError | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const CHUNK = 100; // keeps `in.(…)` filters well under URL length limits

function chunks<T>(list: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Select `columns` where `column` is in `values`, chunked. */
async function selectIn<T>(table: string, columns: string, column: string, values: string[]): Promise<T[]> {
  if (!values.length) return [];
  const parts = await Promise.all(
    chunks(values).map(async (part) => check(await db().from(table).select(columns).in(column, part)) as unknown as T[]),
  );
  return parts.flat();
}

async function deleteIds(table: string, ids: string[]) {
  for (const part of chunks(ids)) check(await db().from(table).delete().in("id", part));
}

async function upsertChunked(table: string, rows: object[]) {
  for (const part of chunks(rows, 500)) check(await db().from(table).upsert(part));
}

/** Delete rows under `parentIds` whose id is not in `keep`. */
async function prune(table: string, parentColumn: string, parentIds: string[], keep: { id: string }[]) {
  const keepIds = new Set(keep.map((r) => r.id));
  const existing = await selectIn<{ id: string }>(table, "id", parentColumn, parentIds);
  await deleteIds(table, existing.map((r) => r.id).filter((id) => !keepIds.has(id)));
}

const COURSE_COLS = "id,key,title,description,passing_score,lock_until_passed,is_active";

export const supabaseRepo: Repository = {
  mode: "supabase",

  async listCourses() {
    return check(await db().from("courses").select("id,key,title,is_active").order("created_at")) as CourseSummary[];
  },

  async load(courseId) {
    const query = db().from("courses").select(COURSE_COLS);
    const course = (
      courseId
        ? check(await query.eq("id", courseId).maybeSingle())
        : check(await query.order("is_active", { ascending: false }).order("created_at").limit(1).maybeSingle())
    ) as Course | null;
    if (!course) return null;

    const topics = check(
      await db().from("topics").select("id,course_id,key,title,description,position").eq("course_id", course.id),
    ) as { id: string }[];
    const topicIds = topics.map((t) => t.id);
    const lessons = await selectIn<{ id: string }>(
      "lessons", "id,topic_id,key,title,description,position,duration_minutes", "topic_id", topicIds,
    );
    const lessonIds = lessons.map((l) => l.id);

    const [materials, lessonQuizzes, topicQuizzes, progress, notes, attachments] = await Promise.all([
      selectIn<{ id: string }>("lesson_materials", "id,lesson_id,key,type,title,url,duration_minutes,note,position", "lesson_id", lessonIds),
      selectIn<{ id: string }>("quizzes", "id,lesson_id,topic_id,title,passing_score", "lesson_id", lessonIds),
      selectIn<{ id: string }>("quizzes", "id,lesson_id,topic_id,title,passing_score", "topic_id", topicIds),
      selectIn("lesson_progress", "lesson_id,status,material_completed,last_opened_at,completed_at", "lesson_id", lessonIds),
      selectIn("lesson_notes", "lesson_id,content,updated_at", "lesson_id", lessonIds),
      selectIn("lesson_attachments", "id,lesson_id,file_name,file_url,mime_type,size_bytes,created_at", "lesson_id", lessonIds),
    ]);
    const quizzes = [...lessonQuizzes, ...topicQuizzes];
    const quizIds = quizzes.map((q) => q.id);
    const materialIds = materials.map((m) => m.id);

    const [questions, attempts, materialViews] = await Promise.all([
      selectIn<{ id: string }>("quiz_questions", "id,quiz_id,key,type,question,explanation,model_answer,points,position", "quiz_id", quizIds),
      selectIn("quiz_attempts", "id,quiz_id,score,total,percent,passed,completed_at", "quiz_id", quizIds),
      selectIn("material_views", "material_id,viewed_at", "material_id", materialIds),
    ]);
    const questionIds = questions.map((q) => q.id);
    const [options, lastResults] = await Promise.all([
      selectIn("quiz_options", "id,question_id,text,is_correct,position", "question_id", questionIds),
      selectIn("question_last_results", "question_id,is_correct,answered_at", "question_id", questionIds),
    ]);

    return assemble({
      course,
      topics: topics as never,
      lessons: lessons as never,
      materials: materials as never,
      quizzes: quizzes as never,
      questions: questions as never,
      options: options as never,
      progress: progress as never,
      materialViews: materialViews as never,
      attempts: attempts as never,
      lastResults: lastResults as never,
      notes: notes as never,
      attachments: attachments as never,
    });
  },

  async setActiveCourse(id) {
    check(await db().rpc("set_active_course", { course_id: id }));
  },

  async upsert(table, rows) {
    const clean =
      table === "courses" ? (rows as Course[]).map((c) => ({ ...c, updated_at: new Date().toISOString() })) : rows;
    await upsertChunked(table, clean as object[]);
  },

  async remove(table: ContentTable, ids: string[]) {
    await deleteIds(table, ids); // FK "on delete cascade" removes dependents
  },

  async importCourse(rows) {
    const cid = rows.course.id;
    // 1) upsert the course row without touching is_active (activated at the end)
    const { is_active: _active, ...course } = rows.course;
    void _active;
    check(await db().from("courses").upsert({ ...course, updated_at: new Date().toISOString() }));

    // 2) prune rows of this course that the file no longer contains (cascade handles children)
    await prune("topics", "course_id", [cid], rows.topics);
    const topicIds = rows.topics.map((t) => t.id);
    await prune("lessons", "topic_id", topicIds, rows.lessons);
    const lessonIds = rows.lessons.map((l) => l.id);
    await prune("lesson_materials", "lesson_id", lessonIds, rows.materials);
    await prune("quizzes", "lesson_id", lessonIds, rows.quizzes);
    await prune("quizzes", "topic_id", topicIds, rows.quizzes);
    const quizIds = rows.quizzes.map((q) => q.id);
    await prune("quiz_questions", "quiz_id", quizIds, rows.questions);
    await prune("quiz_options", "question_id", rows.questions.map((q) => q.id), rows.options);

    // 3) upsert everything, parents first
    await upsertChunked("topics", rows.topics);
    await upsertChunked("lessons", rows.lessons);
    await upsertChunked("lesson_materials", rows.materials);
    await upsertChunked("quizzes", rows.quizzes);
    await upsertChunked("quiz_questions", rows.questions);
    await upsertChunked("quiz_options", rows.options);

    // 4) only now switch to it — a failed import leaves the previous course active
    await this.setActiveCourse(cid);
  },

  async upsertProgress(lessonId, patch) {
    check(
      await db()
        .from("lesson_progress")
        .upsert({ lesson_id: lessonId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "lesson_id" }),
    );
  },

  async setMaterialViewed(materialId, viewed) {
    if (viewed) check(await db().from("material_views").upsert({ material_id: materialId, viewed_at: new Date().toISOString() }));
    else check(await db().from("material_views").delete().eq("material_id", materialId));
  },

  async recordAttempt(quizId, result, answers) {
    const attempt = check(
      await db().from("quiz_attempts").insert({ quiz_id: quizId, ...result }).select("id,completed_at").single(),
    ) as { id: string; completed_at: string };
    if (answers.length)
      check(
        await db()
          .from("answer_log")
          .insert(answers.map((a) => ({ ...a, attempt_id: attempt.id, answered_at: attempt.completed_at }))),
      );
  },

  async logAnswers(answers) {
    if (answers.length) check(await db().from("answer_log").insert(answers.map((a) => ({ ...a, attempt_id: null }))));
  },

  async saveNote(lessonId, content) {
    const updated_at = new Date().toISOString();
    check(await db().from("lesson_notes").upsert({ lesson_id: lessonId, content, updated_at }, { onConflict: "lesson_id" }));
    return updated_at;
  },

  async uploadAttachment() {
    // TODO(storage): create a private bucket "lesson-files", then:
    //   const path = `${lessonId}/${crypto.randomUUID()}-${file.name}`;
    //   await db().storage.from("lesson-files").upload(path, file);
    //   await db().from("lesson_attachments").insert({ lesson_id, file_name: file.name, file_url: path, mime_type: file.type, size_bytes: file.size });
    throw new NotImplementedError("File storage");
  },
  async deleteAttachment(id) {
    // TODO(storage): also remove the object from the bucket.
    check(await db().from("lesson_attachments").delete().eq("id", id));
  },
};
