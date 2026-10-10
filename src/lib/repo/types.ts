import type {
  Course,
  CourseData,
  LessonInput,
  ProgressPatch,
  QuestionInput,
  TopicInput,
} from "../types";

/**
 * Single seam between the UI and storage.
 * Supabase is the real backend; a localStorage implementation is used
 * automatically when Supabase env vars are missing, so the app runs out of the box.
 */
export interface Repository {
  readonly mode: "supabase" | "local";

  /** Loads the active course (first course), or null if none exists yet. */
  load(): Promise<CourseData | null>;

  createCourse(input: { title: string; description: string }): Promise<void>;
  updateCourse(id: string, patch: Partial<Omit<Course, "id">>): Promise<void>;

  createTopic(courseId: string, input: TopicInput): Promise<void>;
  updateTopic(id: string, patch: Partial<TopicInput>): Promise<void>;
  deleteTopic(id: string): Promise<void>;
  /** ids in the desired order */
  reorderTopics(ids: string[]): Promise<void>;

  createLesson(topicId: string, input: LessonInput): Promise<void>;
  updateLesson(id: string, patch: Partial<LessonInput>): Promise<void>;
  deleteLesson(id: string): Promise<void>;
  reorderLessons(ids: string[]): Promise<void>;

  upsertProgress(lessonId: string, patch: ProgressPatch): Promise<void>;

  /** Creates (no id) or replaces (id) a question and its answers. */
  saveQuestion(lessonId: string, input: QuestionInput, id?: string): Promise<void>;
  deleteQuestion(id: string): Promise<void>;

  addQuizAttempt(lessonId: string, score: number, total: number): Promise<void>;

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
