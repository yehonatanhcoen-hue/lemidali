import { v4, v5 } from "uuid";

/**
 * Content ids are derived from the course key + item key (uuid v5), so the
 * same course file always maps to the same rows: re-importing updates in place
 * and keeps progress. Pure JS — works in insecure contexts (http on a LAN IP).
 */
const NS = "6f1c2b8e-3d4a-4f5b-9c7d-1e2f3a4b5c6d";
const id = (name: string) => v5(name, NS);

export const ids = {
  course: (ck: string) => id(`course/${ck}`),
  topic: (ck: string, key: string) => id(`${ck}/topic/${key}`),
  lesson: (ck: string, key: string) => id(`${ck}/lesson/${key}`),
  material: (ck: string, key: string) => id(`${ck}/material/${key}`),
  lessonQuiz: (ck: string, lessonKey: string) => id(`${ck}/lesson-quiz/${lessonKey}`),
  topicExam: (ck: string, topicKey: string) => id(`${ck}/topic-exam/${topicKey}`),
  question: (ck: string, key: string) => id(`${ck}/question/${key}`),
  option: (questionId: string, index: number) => id(`${questionId}/option/${index}`),
};

/** Random id for learner-state rows. */
export const newId = () => v4();

/** Key for items created by hand in the Manage page. */
export const randomKey = (prefix: string) => `${prefix}-${v4().slice(0, 8)}`;

/** Fallback key for a material without one: stable per lesson + URL. */
export const materialKey = (lessonKey: string, url: string) => `m-${v5(`${lessonKey} ${url}`, NS).slice(0, 12)}`;
