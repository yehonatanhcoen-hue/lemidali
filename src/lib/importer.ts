import { fileToRows } from "./course-file/plan";
import { parseCourseText } from "./course-file/validate";
import type { Repository } from "./repo";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const TEMPLATE_URL = `${BASE}/course-template.json`;
export const GUIDE_URL = `${BASE}/course-format.md`;

/** Loads the placeholder demo course (public/course-template.json). */
export async function importDemo(repo: Repository) {
  const text = await (await fetch(TEMPLATE_URL)).text();
  const parsed = parseCourseText(text);
  if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
  await repo.importCourse(fileToRows(parsed.file));
}

export function downloadText(filename: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
