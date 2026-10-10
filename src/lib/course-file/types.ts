// The importable course file — documented in public/course-format.md
// and public/course.schema.json. Keep all three in sync.

import type { MaterialType, QuestionType } from "../types";

export const FORMAT = "lemidali-course";
export const VERSION = 1;

export const MATERIAL_TYPES: MaterialType[] = ["video", "article", "pdf", "document", "link"];
export const QUESTION_TYPES: QuestionType[] = ["single", "multiple", "true_false", "open"];

interface FileQuestionBase {
  key: string;
  question: string;
  explanation?: string;
  points?: number;
}

export type FileQuestion =
  | (FileQuestionBase & { type: "single"; options: string[]; correct: number })
  | (FileQuestionBase & { type: "multiple"; options: string[]; correct: number[] })
  | (FileQuestionBase & { type: "true_false"; correct: boolean })
  | (FileQuestionBase & { type: "open"; model_answer: string });

export interface FileMaterial {
  key?: string;
  type: MaterialType;
  title: string;
  url: string;
  duration_minutes?: number;
  note?: string;
}

export interface FileQuiz {
  passing_score?: number;
  questions: FileQuestion[];
}

export interface FileExam extends FileQuiz {
  title?: string;
}

export interface FileLesson {
  key: string;
  title: string;
  description?: string;
  duration_minutes?: number;
  materials?: FileMaterial[];
  quiz?: FileQuiz;
}

export interface FileTopic {
  key: string;
  title: string;
  description?: string;
  lessons: FileLesson[];
  final_exam?: FileExam;
}

export interface CourseFile {
  format: typeof FORMAT;
  version: typeof VERSION;
  key: string;
  title: string;
  description?: string;
  passing_score?: number;
  lock_until_passed?: boolean;
  topics: FileTopic[];
}
