// Domain types — mirror supabase/migrations/*_init.sql

export type LessonStatus = "not_started" | "in_progress" | "completed";

export interface Course {
  id: string;
  title: string;
  description: string;
}

export interface Topic {
  id: string;
  course_id: string;
  title: string;
  description: string;
  position: number;
}

export interface Lesson {
  id: string;
  topic_id: string;
  title: string;
  description: string;
  position: number;
  duration_minutes: number;
  learning_url: string | null;
}

export interface LessonProgress {
  lesson_id: string;
  status: LessonStatus;
  material_completed: boolean;
  last_opened_at: string | null;
  completed_at: string | null;
}

export interface QuizAnswer {
  id: string;
  question_id: string;
  answer: string;
  is_correct: boolean;
  position: number;
}

export interface QuizQuestion {
  id: string;
  lesson_id: string;
  question: string;
  position: number;
  answers: QuizAnswer[];
}

export interface QuizAttempt {
  id: string;
  lesson_id: string;
  score: number;
  total: number;
  completed_at: string;
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
  lessons: Lesson[]; // sorted by topic position, then lesson position
  progress: Record<string, LessonProgress>; // by lesson_id
  questions: QuizQuestion[]; // sorted by position, answers sorted
  attempts: QuizAttempt[]; // sorted by completed_at asc
  notes: Record<string, LessonNote>; // by lesson_id
  attachments: LessonAttachment[];
}

export interface TopicInput {
  title: string;
  description: string;
}

export interface LessonInput {
  title: string;
  description: string;
  duration_minutes: number;
  learning_url: string | null;
  topic_id?: string;
}

export interface QuestionInput {
  question: string;
  answers: { answer: string; is_correct: boolean }[];
}

export type ProgressPatch = Partial<Omit<LessonProgress, "lesson_id">>;
