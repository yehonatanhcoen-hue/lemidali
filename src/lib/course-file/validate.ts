import { FORMAT, MATERIAL_TYPES, QUESTION_TYPES, VERSION, type CourseFile } from "./types";

/**
 * Validates a course file with readable Hebrew messages that point to the
 * exact place ("נושא 2 › שיעור 1 › שאלה 3"). Mirrors public/course.schema.json.
 */

export type ValidationResult = { ok: true; file: CourseFile } | { ok: false; errors: string[] };

const KEY_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const MAX_ERRORS = 60;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

/** Accepts raw text — also when pasted from a chat inside ```json fences. */
export function parseCourseText(text: string): ValidationResult {
  let src = text.trim().replace(/^﻿/, "");
  const fence = src.match(/```(?:json)?\s*\n([\s\S]*?)\n?```/);
  if (fence) src = fence[1].trim();
  else {
    // tolerate text around the JSON object
    const start = src.indexOf("{");
    const end = src.lastIndexOf("}");
    if (start > 0 && end > start) src = src.slice(start, end + 1);
  }
  if (!src) return { ok: false, errors: ["הקובץ ריק"] };
  let data: unknown;
  try {
    data = JSON.parse(src);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const pos = Number(msg.match(/position (\d+)/)?.[1]);
    let where = "";
    if (Number.isFinite(pos)) {
      const before = src.slice(0, pos);
      const line = before.split("\n").length;
      const col = pos - before.lastIndexOf("\n");
      where = ` (שורה ${line}, עמודה ${col})`;
    }
    return { ok: false, errors: [`JSON לא תקין${where}: ${msg}`] };
  }
  return validateCourse(data);
}

export function validateCourse(data: unknown): ValidationResult {
  const errors: string[] = [];
  const seenKeys = new Map<string, string>();
  const err = (where: string, msg: string) => {
    if (errors.length < MAX_ERRORS) errors.push(where ? `${where}: ${msg}` : msg);
  };

  const unknownFields = (o: Obj, allowed: string[], where: string) => {
    for (const k of Object.keys(o))
      if (!allowed.includes(k)) err(where, `שדה לא מוכר "${k}" (מותרים: ${allowed.join(", ")})`);
  };

  const key = (o: Obj, where: string, required = true) => {
    const v = o.key;
    if (v === undefined && !required) return;
    if (typeof v !== "string") return err(where, `חסר "key"`);
    if (!KEY_RE.test(v)) return err(where, `key "${v}" לא תקין — רק אותיות אנגליות קטנות, ספרות ומקפים`);
    const prev = seenKeys.get(v);
    if (prev) return err(where, `key "${v}" כבר בשימוש ב${prev} — כל key חייב להיות ייחודי בקובץ`);
    seenKeys.set(v, where);
  };

  const text = (o: Obj, field: string, where: string, required = true) => {
    const v = o[field];
    if (v === undefined && !required) return;
    if (required ? !nonEmpty(v) : typeof v !== "string") err(where, `"${field}" חייב להיות טקסט${required ? " לא ריק" : ""}`);
  };

  const intField = (o: Obj, field: string, where: string, min: number, max: number) => {
    const v = o[field];
    if (v === undefined) return;
    if (!isInt(v) || v < min || v > max) err(where, `"${field}" חייב להיות מספר שלם בין ${min} ל-${max}`);
  };

  const label = (base: string, o: unknown) =>
    isObj(o) && typeof o.key === "string" ? `${base} (${o.key})` : base;

  const question = (q: unknown, where: string) => {
    if (!isObj(q)) return err(where, "חייבת להיות אובייקט");
    key(q, where);
    text(q, "question", where);
    text(q, "explanation", where, false);
    intField(q, "points", where, 1, 10);
    const type = q.type;
    if (!QUESTION_TYPES.includes(type as never))
      return err(where, `"type" חייב להיות אחד מ: ${QUESTION_TYPES.join(", ")}`);
    const base = ["key", "type", "question", "explanation", "points"];
    if (type === "single" || type === "multiple") {
      unknownFields(q, [...base, "options", "correct"], where);
      const max = type === "single" ? 6 : 8;
      const opts = q.options;
      if (!Array.isArray(opts) || opts.length < 2 || opts.length > max || !opts.every(nonEmpty))
        return err(where, `"options" חייב להיות מערך של 2–${max} תשובות לא ריקות`);
      const inRange = (i: unknown) => isInt(i) && i >= 0 && i < opts.length;
      if (type === "single") {
        if (!inRange(q.correct))
          err(where, `"correct" חייב להיות אינדקס אחד בין 0 ל-${opts.length - 1} (מתחיל מ-0)`);
      } else {
        const c = q.correct;
        if (!Array.isArray(c) || c.length < 1 || !c.every(inRange))
          err(where, `"correct" חייב להיות מערך אינדקסים בין 0 ל-${opts.length - 1}, לפחות אחד`);
        else if (new Set(c).size !== c.length) err(where, `"correct" מכיל אינדקס כפול`);
      }
    } else if (type === "true_false") {
      unknownFields(q, [...base, "correct"], where);
      if (typeof q.correct !== "boolean") err(where, `"correct" חייב להיות true או false`);
    } else {
      unknownFields(q, [...base, "model_answer"], where);
      text(q, "model_answer", where);
    }
  };

  const quiz = (z: unknown, where: string, isExam: boolean) => {
    if (!isObj(z)) return err(where, "חייב להיות אובייקט עם questions");
    unknownFields(z, isExam ? ["title", "passing_score", "questions"] : ["passing_score", "questions"], where);
    if (isExam) text(z, "title", where, false);
    intField(z, "passing_score", where, 0, 100);
    if (!Array.isArray(z.questions) || z.questions.length === 0) return err(where, `"questions" חייב להכיל לפחות שאלה אחת`);
    z.questions.forEach((q, i) => question(q, `${where} › ${label(`שאלה ${i + 1}`, q)}`));
  };

  const material = (m: unknown, where: string) => {
    if (!isObj(m)) return err(where, "חייב להיות אובייקט");
    unknownFields(m, ["key", "type", "title", "url", "duration_minutes", "note"], where);
    key(m, where, false);
    if (!MATERIAL_TYPES.includes(m.type as never)) err(where, `"type" חייב להיות אחד מ: ${MATERIAL_TYPES.join(", ")}`);
    text(m, "title", where);
    text(m, "note", where, false);
    intField(m, "duration_minutes", where, 1, 1440);
    if (typeof m.url !== "string" || !/^https?:\/\/\S+\.\S+/.test(m.url))
      err(where, `"url" חייב להיות כתובת מלאה שמתחילה ב-https://`);
  };

  const lesson = (l: unknown, where: string) => {
    if (!isObj(l)) return err(where, "חייב להיות אובייקט");
    unknownFields(l, ["key", "title", "description", "duration_minutes", "materials", "quiz"], where);
    key(l, where);
    text(l, "title", where);
    text(l, "description", where, false);
    intField(l, "duration_minutes", where, 1, 1440);
    if (l.materials !== undefined) {
      if (!Array.isArray(l.materials)) err(where, `"materials" חייב להיות מערך`);
      else l.materials.forEach((m, i) => material(m, `${where} › ${label(`חומר ${i + 1}`, m)}`));
    }
    if (l.quiz !== undefined) quiz(l.quiz, `${where} › מבחן`, false);
  };

  const topic = (t: unknown, where: string) => {
    if (!isObj(t)) return err(where, "חייב להיות אובייקט");
    unknownFields(t, ["key", "title", "description", "lessons", "final_exam"], where);
    key(t, where);
    text(t, "title", where);
    text(t, "description", where, false);
    if (!Array.isArray(t.lessons) || t.lessons.length === 0) err(where, `"lessons" חייב להכיל לפחות שיעור אחד`);
    else t.lessons.forEach((l, i) => lesson(l, `${where} › ${label(`שיעור ${i + 1}`, l)}`));
    if (t.final_exam !== undefined) quiz(t.final_exam, `${where} › מבחן סיכום`, true);
  };

  if (!isObj(data)) return { ok: false, errors: ["הקובץ חייב להיות אובייקט JSON אחד ({ ... })"] };
  if (data.format !== FORMAT) err("", `"format" חייב להיות "${FORMAT}"`);
  if (data.version !== VERSION) err("", `"version" חייב להיות ${VERSION}`);
  unknownFields(
    data,
    ["$schema", "format", "version", "key", "title", "description", "passing_score", "lock_until_passed", "topics"],
    "קורס",
  );
  key(data, "קורס");
  text(data, "title", "קורס");
  text(data, "description", "קורס", false);
  intField(data, "passing_score", "קורס", 0, 100);
  if (data.lock_until_passed !== undefined && typeof data.lock_until_passed !== "boolean")
    err("קורס", `"lock_until_passed" חייב להיות true או false`);
  if (!Array.isArray(data.topics) || data.topics.length === 0) err("קורס", `"topics" חייב להכיל לפחות נושא אחד`);
  else data.topics.forEach((t, i) => topic(t, label(`נושא ${i + 1}`, t)));

  if (errors.length) {
    if (errors.length >= MAX_ERRORS) errors.push("…ויש עוד שגיאות. תקן את אלה ונסה שוב.");
    return { ok: false, errors };
  }
  return { ok: true, file: data as unknown as CourseFile };
}
