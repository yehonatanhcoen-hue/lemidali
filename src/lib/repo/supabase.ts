import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabase } from "../supabase/client";
import type { Course, Topic } from "../types";
import { assemble } from "./assemble";
import { NotImplementedError, type Repository } from "./types";

function check<T>(res: { data: T; error: PostgrestError | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const db = () => getSupabase();

async function nextPosition(table: "topics" | "lessons" | "quiz_questions", column: string, value: string) {
  const rows = check(
    await db().from(table).select("position").eq(column, value).order("position", { ascending: false }).limit(1),
  ) as { position: number }[];
  return rows.length ? rows[0].position + 1 : 0;
}

export const supabaseRepo: Repository = {
  mode: "supabase",

  async load() {
    const course = check(
      await db().from("courses").select("id,title,description").order("created_at").limit(1).maybeSingle(),
    ) as Course | null;
    if (!course) return null;

    const topics = check(
      await db().from("topics").select("id,course_id,title,description,position").eq("course_id", course.id),
    ) as Topic[];
    const topicIds = topics.map((t) => t.id);

    const lessons: { id: string }[] = topicIds.length
      ? (check(
          await db()
            .from("lessons")
            .select("id,topic_id,title,description,position,duration_minutes,learning_url")
            .in("topic_id", topicIds),
        ) ?? [])
      : [];
    const lessonIds = lessons.map((l) => l.id as string);

    if (!lessonIds.length) {
      return assemble({ course, topics, lessons: [], progress: [], questions: [], answers: [], attempts: [], notes: [], attachments: [] });
    }

    const [progress, questions, attempts, notes, attachments] = await Promise.all([
      db().from("lesson_progress").select("lesson_id,status,material_completed,last_opened_at,completed_at").in("lesson_id", lessonIds),
      db().from("quiz_questions").select("id,lesson_id,question,position,quiz_answers(id,question_id,answer,is_correct,position)").in("lesson_id", lessonIds),
      db().from("quiz_attempts").select("id,lesson_id,score,total,completed_at").in("lesson_id", lessonIds),
      db().from("lesson_notes").select("lesson_id,content,updated_at").in("lesson_id", lessonIds),
      db().from("lesson_attachments").select("id,lesson_id,file_name,file_url,mime_type,size_bytes,created_at").in("lesson_id", lessonIds),
    ]);

    const qRows = check(questions) as unknown as {
      id: string;
      lesson_id: string;
      question: string;
      position: number;
      quiz_answers: { id: string; question_id: string; answer: string; is_correct: boolean; position: number }[];
    }[];

    return assemble({
      course,
      topics,
      lessons: lessons as never,
      progress: check(progress) as never,
      questions: qRows.map((q) => ({ id: q.id, lesson_id: q.lesson_id, question: q.question, position: q.position })),
      answers: qRows.flatMap((q) => q.quiz_answers),
      attempts: check(attempts) as never,
      notes: check(notes) as never,
      attachments: check(attachments) as never,
    });
  },

  async createCourse(input) {
    check(await db().from("courses").insert(input));
  },
  async updateCourse(id, patch) {
    check(await db().from("courses").update(patch).eq("id", id));
  },

  async createTopic(courseId, input) {
    const position = await nextPosition("topics", "course_id", courseId);
    check(await db().from("topics").insert({ course_id: courseId, ...input, position }));
  },
  async updateTopic(id, patch) {
    check(await db().from("topics").update(patch).eq("id", id));
  },
  async deleteTopic(id) {
    check(await db().from("topics").delete().eq("id", id));
  },
  async reorderTopics(ids) {
    await Promise.all(ids.map(async (id, position) => check(await db().from("topics").update({ position }).eq("id", id))));
  },

  async createLesson(topicId, input) {
    const position = await nextPosition("lessons", "topic_id", topicId);
    check(await db().from("lessons").insert({ ...input, topic_id: topicId, position }));
  },
  async updateLesson(id, patch) {
    const update: Record<string, unknown> = { ...patch };
    if (patch.topic_id) {
      const current = check(await db().from("lessons").select("topic_id").eq("id", id).single()) as { topic_id: string };
      if (current.topic_id !== patch.topic_id) update.position = await nextPosition("lessons", "topic_id", patch.topic_id);
    }
    check(await db().from("lessons").update(update).eq("id", id));
  },
  async deleteLesson(id) {
    check(await db().from("lessons").delete().eq("id", id));
  },
  async reorderLessons(ids) {
    await Promise.all(ids.map(async (id, position) => check(await db().from("lessons").update({ position }).eq("id", id))));
  },

  async upsertProgress(lessonId, patch) {
    check(
      await db()
        .from("lesson_progress")
        .upsert({ lesson_id: lessonId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "lesson_id" }),
    );
  },

  async saveQuestion(lessonId, input, id) {
    let qid = id;
    if (qid) {
      check(await db().from("quiz_questions").update({ question: input.question }).eq("id", qid));
      check(await db().from("quiz_answers").delete().eq("question_id", qid));
    } else {
      const position = await nextPosition("quiz_questions", "lesson_id", lessonId);
      const row = check(
        await db().from("quiz_questions").insert({ lesson_id: lessonId, question: input.question, position }).select("id").single(),
      ) as { id: string };
      qid = row.id;
    }
    check(
      await db()
        .from("quiz_answers")
        .insert(input.answers.map((a, position) => ({ question_id: qid, answer: a.answer, is_correct: a.is_correct, position }))),
    );
  },
  async deleteQuestion(id) {
    check(await db().from("quiz_questions").delete().eq("id", id));
  },

  async addQuizAttempt(lessonId, score, total) {
    check(await db().from("quiz_attempts").insert({ lesson_id: lessonId, score, total }));
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
