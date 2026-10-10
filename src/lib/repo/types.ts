import type {
  AnswerRecord,
  AttemptResult,
  ContentRows,
  ContentTable,
  ContentTables,
  CourseData,
  CourseSummary,
  ProgressPatch,
} from "../types";

/**
 * Single seam between the UI and storage.
 * Supabase is the real backend; a localStorage implementation is used
 * automatically when Supabase env vars are missing.
 *
 * Content editing is generic (upsert/remove rows): ids and keys are computed
 * by the caller (see lib/edit.ts), so both backends stay thin.
 */
export interface Repository {
  readonly mode: "supabase" | "local";

  listCourses(): Promise<CourseSummary[]>;
  /** Loads the given course, or the active one (falls back to the first). null if none exist. */
  load(courseId?: string): Promise<CourseData | null>;
  setActiveCourse(id: string): Promise<void>;

  upsert<T extends ContentTable>(table: T, rows: ContentTables[T][]): Promise<void>;
  /** Deletes rows and everything that depends on them (incl. learner state). */
  remove(table: ContentTable, ids: string[]): Promise<void>;

  /** Upserts all rows of one course, deletes its rows not in `rows`, makes it active. */
  importCourse(rows: ContentRows): Promise<void>;

  upsertProgress(lessonId: string, patch: ProgressPatch): Promise<void>;
  setMaterialViewed(materialId: string, viewed: boolean): Promise<void>;
  /** A full quiz run: stores the attempt and every answer. */
  recordAttempt(quizId: string, result: AttemptResult, answers: AnswerRecord[]): Promise<void>;
  /** Mistakes practice: stores answers only (updates "my mistakes"). */
  logAnswers(answers: AnswerRecord[]): Promise<void>;

  saveNote(lessonId: string, content: string): Promise<string /* updated_at */>;

  // TODO(storage): implement upload once a Supabase Storage bucket is connected.
  // Expected flow: upload to bucket "lesson-files" at `${lessonId}/${uuid}-${name}`,
  // then insert a row into lesson_attachments with file_url = storage path.
  uploadAttachment(lessonId: string, file: File): Promise<void>;
  deleteAttachment(id: string): Promise<void>;
}

export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`${what} is not connected yet`);
    this.name = "NotImplementedError";
  }
}
