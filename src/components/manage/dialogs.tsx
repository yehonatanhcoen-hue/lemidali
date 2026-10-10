"use client";

import { useState } from "react";
import { MATERIAL_TYPES, QUESTION_TYPES } from "@/lib/course-file/types";
import { createCourse, createTopic, saveLesson, saveMaterial, saveQuestion, updateCourse, updateTopic, type QuizOwner } from "@/lib/edit";
import { QUESTION_TYPE_LABEL } from "@/lib/quiz";
import { useCourse } from "@/lib/store";
import type { CourseData, Lesson, LessonMaterial, QuestionType, QuizQuestion, Topic } from "@/lib/types";
import { normalizeUrl } from "@/lib/url";
import { IconChevron, IconPlus, IconTrash } from "../icons";
import { MATERIAL_LABEL } from "../lesson/material";
import { Modal } from "../modal";
import { Button, Field, cx, inputCls } from "../ui";

function useSubmit(onClose: () => void) {
  const { run } = useCourse();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (fn: Parameters<typeof run>[0]) => {
    setSaving(true);
    setError(null);
    try {
      await run(fn);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };
  return { saving, error, setError, submit };
}

function Actions({ saving, onCancel, error }: { saving: boolean; onCancel: () => void; error: string | null }) {
  return (
    <>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          ביטול
        </Button>
        <Button type="submit" disabled={saving} data-testid="dialog-submit">
          שמור
        </Button>
      </div>
    </>
  );
}

function Select({ value, onChange, children, testId }: { value: string; onChange: (v: string) => void; children: React.ReactNode; testId?: string }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, "appearance-none pe-9")} data-testid={testId}>
        {children}
      </select>
      <IconChevron size={16} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 -rotate-90 text-muted" />
    </div>
  );
}

/* ---------- course ---------- */

export function CourseDialog({ data, onClose }: { data: CourseData | null; onClose: () => void }) {
  const c = data?.course;
  const [title, setTitle] = useState(c?.title ?? "");
  const [description, setDescription] = useState(c?.description ?? "");
  const [passing, setPassing] = useState(String(c?.passing_score ?? 80));
  const [lock, setLock] = useState(c?.lock_until_passed ?? true);
  const { saving, error, submit } = useSubmit(onClose);
  return (
    <Modal title={c ? "הגדרות קורס" : "קורס חדש"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit((repo) =>
            c
              ? updateCourse(repo, c, {
                  title: title.trim(),
                  description: description.trim(),
                  passing_score: Math.min(100, Math.max(0, Number(passing) || 0)),
                  lock_until_passed: lock,
                })
              : createCourse(repo, { title: title.trim(), description: description.trim() }),
          );
        }}
        className="space-y-4"
      >
        <Field label="שם הקורס">
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} autoFocus />
        </Field>
        <Field label="תיאור">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls} />
        </Field>
        {c && (
          <>
            <Field label="ציון עובר ברירת מחדל (%)" hint="אפשר לקבוע ציון אחר לכל מבחן בקובץ הקורס">
              <input type="number" min={0} max={100} value={passing} onChange={(e) => setPassing(e.target.value)} className={cx(inputCls, "num")} data-testid="passing-input" />
            </Field>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5">
              <input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} className="mt-0.5 size-5 accent-[var(--accent)]" data-testid="lock-input" />
              <span>
                <span className="block font-medium">נעילה לפי ציון</span>
                <span className="block text-sm text-muted">שיעור או מבחן נפתחים רק אחרי מעבר כל המבחנים שלפניהם</span>
              </span>
            </label>
          </>
        )}
        <Actions saving={saving} onCancel={onClose} error={error} />
      </form>
    </Modal>
  );
}

/* ---------- topic ---------- */

export function TopicDialog({ data, topic, onClose }: { data: CourseData; topic?: Topic; onClose: () => void }) {
  const [title, setTitle] = useState(topic?.title ?? "");
  const [description, setDescription] = useState(topic?.description ?? "");
  const { saving, error, submit } = useSubmit(onClose);
  return (
    <Modal title={topic ? "עריכת נושא" : "נושא חדש"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const input = { title: title.trim(), description: description.trim() };
          void submit((repo) => (topic ? updateTopic(repo, topic, input) : createTopic(repo, data, input)));
        }}
        className="space-y-4"
      >
        <Field label="שם הנושא">
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} autoFocus data-testid="topic-title" />
        </Field>
        <Field label="תיאור">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
        </Field>
        <Actions saving={saving} onCancel={onClose} error={error} />
      </form>
    </Modal>
  );
}

/* ---------- lesson ---------- */

export function LessonDialog({ data, topicId, lesson, onClose }: { data: CourseData; topicId: string; lesson?: Lesson; onClose: () => void }) {
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [description, setDescription] = useState(lesson?.description ?? "");
  const [duration, setDuration] = useState(String(lesson?.duration_minutes ?? 60));
  const [topic, setTopic] = useState(lesson?.topic_id ?? topicId);
  const { saving, error, submit } = useSubmit(onClose);
  return (
    <Modal title={lesson ? "עריכת שיעור" : "שיעור חדש"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit((repo) =>
            saveLesson(
              repo,
              data,
              { title: title.trim(), description: description.trim(), duration_minutes: Math.max(1, Number(duration) || 60), topic_id: topic },
              lesson,
            ),
          );
        }}
        className="space-y-4"
      >
        <Field label="שם השיעור">
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} autoFocus data-testid="lesson-title" />
        </Field>
        <Field label="תיאור">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="משך מתוכנן (דקות)">
            <input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} className={cx(inputCls, "num")} data-testid="lesson-duration" />
          </Field>
          <Field label="נושא">
            <Select value={topic} onChange={setTopic}>
              {data.topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Actions saving={saving} onCancel={onClose} error={error} />
      </form>
    </Modal>
  );
}

/* ---------- material ---------- */

export function MaterialDialog({
  data,
  lessonId,
  material,
  onClose,
}: {
  data: CourseData;
  lessonId: string;
  material?: LessonMaterial;
  onClose: () => void;
}) {
  const [type, setType] = useState(material?.type ?? "video");
  const [title, setTitle] = useState(material?.title ?? "");
  const [url, setUrl] = useState(material?.url ?? "");
  const [duration, setDuration] = useState(material?.duration_minutes ? String(material.duration_minutes) : "");
  const [note, setNote] = useState(material?.note ?? "");
  const { saving, error, setError, submit } = useSubmit(onClose);
  return (
    <Modal title={material ? "עריכת חומר לימוד" : "חומר לימוד חדש"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const clean = normalizeUrl(url);
          if (!clean) return setError("הקישור לא נראה תקין");
          void submit((repo) =>
            saveMaterial(
              repo,
              data,
              lessonId,
              { type, title: title.trim(), url: clean, duration_minutes: Number(duration) > 0 ? Math.round(Number(duration)) : null, note: note.trim() },
              material,
            ),
          );
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="סוג">
            <Select value={type} onChange={(v) => setType(v as typeof type)} testId="material-type">
              {MATERIAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {MATERIAL_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="כותרת">
              <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} autoFocus data-testid="material-title" />
            </Field>
          </div>
        </div>
        <Field label="קישור" hint="סרטון YouTube יוצג עם נגן בתוך השיעור">
          <input required dir="ltr" inputMode="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} className={inputCls} data-testid="material-url" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="אורך (דקות)">
            <input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} className={cx(inputCls, "num")} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="הערה">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="למשל: לצפות מדקה 12" className={inputCls} />
            </Field>
          </div>
        </div>
        <Actions saving={saving} onCancel={onClose} error={error} />
      </form>
    </Modal>
  );
}

/* ---------- question ---------- */

export function QuestionDialog({
  data,
  owner,
  question,
  onClose,
}: {
  data: CourseData;
  owner: QuizOwner;
  question?: QuizQuestion;
  onClose: () => void;
}) {
  const [type, setType] = useState<QuestionType>(question?.type ?? "single");
  const [text, setText] = useState(question?.question ?? "");
  const [options, setOptions] = useState<{ text: string; is_correct: boolean }[]>(() =>
    question && (question.type === "single" || question.type === "multiple")
      ? question.options.map((o) => ({ text: o.text, is_correct: o.is_correct }))
      : [0, 1, 2, 3].map((i) => ({ text: "", is_correct: i === 0 })),
  );
  const [tf, setTf] = useState(question?.type === "true_false" ? question.options[0]?.is_correct ?? true : true);
  const [model, setModel] = useState(question?.model_answer ?? "");
  const [explanation, setExplanation] = useState(question?.explanation ?? "");
  const [points, setPoints] = useState(String(question?.points ?? 1));
  const { saving, error, setError, submit } = useSubmit(onClose);
  const max = type === "single" ? 6 : 8;

  const changeType = (t: QuestionType) => {
    setType(t);
    if (t === "single") {
      // keep exactly one correct
      const first = Math.max(0, options.findIndex((o) => o.is_correct));
      setOptions(options.slice(0, 6).map((o, i) => ({ ...o, is_correct: i === first })));
    }
  };

  return (
    <Modal title={question ? "עריכת שאלה" : "שאלה חדשה"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (type === "single" || type === "multiple") {
            if (options.some((o) => !o.text.trim())) return setError("יש למלא את כל התשובות (או למחוק שורות ריקות)");
            if (!options.some((o) => o.is_correct)) return setError("יש לסמן לפחות תשובה נכונה אחת");
          }
          if (type === "open" && !model.trim()) return setError("יש לכתוב תשובה לדוגמה");
          void submit((repo) =>
            saveQuestion(
              repo,
              data,
              owner,
              {
                type,
                question: text.trim(),
                explanation: explanation.trim(),
                model_answer: model.trim(),
                points: Math.min(10, Math.max(1, Number(points) || 1)),
                options: options.map((o) => ({ text: o.text.trim(), is_correct: o.is_correct })),
                tfCorrect: tf,
              },
              question,
            ),
          );
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-surface-2 p-1 sm:grid-cols-4" role="radiogroup" aria-label="סוג שאלה">
          {QUESTION_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => changeType(t)}
              aria-pressed={type === t}
              className={cx("rounded-lg px-2 py-2 text-xs font-medium transition", type === t ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink")}
              data-testid={`qtype-${t}`}
            >
              {QUESTION_TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        <Field label={type === "true_false" ? "הטענה" : "השאלה"}>
          <textarea required value={text} onChange={(e) => setText(e.target.value)} rows={2} className={inputCls} autoFocus data-testid="question-text" />
        </Field>

        {(type === "single" || type === "multiple") && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-ink-2">
              תשובות · {type === "single" ? "סמן את הנכונה" : "סמן את כל הנכונות"}
            </legend>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className={cx("flex items-center gap-2 rounded-xl border p-1.5 pe-2 transition", o.is_correct ? "border-success bg-success-soft" : "border-line")}>
                  <input
                    value={o.text}
                    onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                    placeholder={`תשובה ${i + 1}`}
                    className="min-w-0 flex-1 rounded-lg bg-transparent px-2.5 py-2 outline-none placeholder:text-muted"
                    data-testid="answer-input"
                  />
                  <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-ink-2">
                    <input
                      type={type === "single" ? "radio" : "checkbox"}
                      name="correct"
                      checked={o.is_correct}
                      onChange={(e) =>
                        setOptions(options.map((x, j) => (type === "single" ? { ...x, is_correct: j === i } : j === i ? { ...x, is_correct: e.target.checked } : x)))
                      }
                      className="size-4 accent-[var(--success)]"
                      data-testid="correct-input"
                    />
                    נכונה
                  </label>
                  {options.length > 2 && (
                    <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))} className="text-muted hover:text-danger" aria-label="מחק תשובה">
                      <IconTrash size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < max && (
              <button type="button" onClick={() => setOptions([...options, { text: "", is_correct: false }])} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent">
                <IconPlus size={15} /> הוסף תשובה
              </button>
            )}
          </fieldset>
        )}

        {type === "true_false" && (
          <div className="grid grid-cols-2 gap-2">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setTf(v)}
                className={cx("rounded-xl border px-4 py-3 font-medium transition", tf === v ? "border-success bg-success-soft text-success" : "border-line text-ink-2")}
                data-testid={`tf-${v}`}
              >
                {v ? "✓ נכון" : "✗ לא נכון"}
              </button>
            ))}
          </div>
        )}

        {type === "open" && (
          <Field label="תשובה לדוגמה" hint="מוצגת אחרי שהלומד עונה, כדי שיבדוק את עצמו">
            <textarea value={model} onChange={(e) => setModel(e.target.value)} rows={3} className={inputCls} data-testid="model-answer" />
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-3">
            <Field label="הסבר (אופציונלי)" hint="למה זו התשובה הנכונה — מוצג אחרי שעונים">
              <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} className={inputCls} />
            </Field>
          </div>
          <Field label="נקודות">
            <input type="number" min={1} max={10} value={points} onChange={(e) => setPoints(e.target.value)} className={cx(inputCls, "num")} />
          </Field>
        </div>
        <Actions saving={saving} onCancel={onClose} error={error} />
      </form>
    </Modal>
  );
}
