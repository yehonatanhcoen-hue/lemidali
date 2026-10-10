// Domain types — mirror supabase/migrations/*_init.sql

export type LessonStatus = "not_started" | "in_progress" | "completed";
export type MaterialType = "video" | "article" | "pdf" | "document" | "link";
export type QuestionType = "single" | "multiple" | "true_false" | "open";

export interface Course {
  id: string;
  key: string;
  title: string;
  description: string;
  passing_score: number;
  lock_until_passed: boolean;
  is_active: boolean;
}

export type CourseSummary = Pick<Course, "id" | "key" | "title" | "is_active">;

export interface Topic {
  id: string;
  course_id: string;
  key: string;
  title: string;
  description: string;
  position: number;
}

export interface Lesson {
  id: string;
  topic_id: string;
  key: string;
  title: string;
  description: string;
  position: number;
  duration_minutes: number;
}

export interface LessonMaterial {
  id: string;
  lesson_id: string;
  key: string;
  type: MaterialType;
  title: string;
  url: string;
  duration_minutes: number | null;
  note: string;
  position: number;
}

/** Lesson quiz (lesson_id set) or topic final exam (topic_id set). */
export interface Quiz {
  id: string;
  lesson_id: string | null;
  topic_id: string | null;
  title: string;
  passing_score: number | null; // null → course default
}

export interface QuizOption {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  position: number;
}

export interface QuizQuestionRow {
  id: string;
  quiz_id: string;
  key: string;
  type: QuestionType;
  question: string;
  explanation: string;
  model_answer: string;
  points: number;
  position: number;
}

export interface QuizQuestion extends QuizQuestionRow {
  options: QuizOption[];
}

export interface LessonProgress {
  lesson_id: string;
  status: LessonStatus;
  material_completed: boolean;
  last_opened_at: string | null;
  completed_at: string | null;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  completed_at: string;
}

export interface LastResult {
  question_id: string;
  is_correct: boolean;
  answered_at: string;
}

export interface LessonNote {
  lesson_id: string;
  content: string;
  updated_at: string;
}

export interface LessonAttachment {
  id: string;
  lesson_id: string;
  file_name: string;
  file_url: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

/** Everything the UI needs for one course, loaded in one go. */
export interface CourseData {
  course: Course;
  topics: Topic[]; // sorted by position
  lessons: Lesson[]; // course order: topic position, then lesson position
  materials: LessonMaterial[]; // sorted by position
  quizzes: Quiz[];
  questions: QuizQuestion[]; // sorted by position, options sorted
  progress: Record<string, LessonProgress>; // by lesson_id
  materialViews: Record<string, string>; // material_id → viewed_at
  attempts: QuizAttempt[]; // completed_at asc
  lastResults: Record<string, LastResult>; // by question_id
  notes: Record<string, LessonNote>; // by lesson_id
  attachments: LessonAttachment[];
}

/** Content rows of one course — the result of planning an import. */
export interface ContentRows {
  course: Course;
  topics: Topic[];
  lessons: Lesson[];
  materials: LessonMaterial[];
  quizzes: Quiz[];
  questions: QuizQuestionRow[];
  options: QuizOption[];
}

export interface AnswerRecord {
  question_id: string;
  is_correct: boolean;
}

export interface AttemptResult {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
}

export type ProgressPatch = Partial<Omit<LessonProgress, "lesson_id">>;

/** Tables the generic upsert/remove operations work on. */
export interface ContentTables {
  courses: Course;
  topics: Topic;
  lessons: Lesson;
  lesson_materials: LessonMaterial;
  quizzes: Quiz;
  quiz_questions: QuizQuestionRow;
  quiz_options: QuizOption;
}
export type ContentTable = keyof ContentTables;
