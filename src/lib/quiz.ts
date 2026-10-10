import type { AttemptResult, QuizQuestion } from "./types";

/** What the learner answered for one question. */
export type Response =
  | { kind: "options"; selected: string[] } // single / multiple / true_false
  | { kind: "open"; text: string; selfCorrect: boolean };

/** All-or-nothing: multiple-choice is correct only if exactly the correct options were chosen. */
export function isCorrect(q: QuizQuestion, r: Response): boolean {
  if (q.type === "open") return r.kind === "open" && r.selfCorrect;
  if (r.kind !== "options") return false;
  const correct = new Set(q.options.filter((o) => o.is_correct).map((o) => o.id));
  return r.selected.length === correct.size && r.selected.every((id) => correct.has(id));
}

export function scoreOf(questions: QuizQuestion[], results: Record<string, boolean>, passing: number): AttemptResult {
  const total = questions.reduce((s, q) => s + q.points, 0) || 1;
  const score = questions.reduce((s, q) => s + (results[q.id] ? q.points : 0), 0);
  const percent = Math.round((score / total) * 100);
  return { score, total, percent, passed: percent >= passing };
}

export const QUESTION_TYPE_LABEL: Record<QuizQuestion["type"], string> = {
  single: "בחירה אחת",
  multiple: "בחירה מרובה",
  true_false: "נכון / לא נכון",
  open: "שאלה פתוחה",
};
