"use client";

import { useState } from "react";
import { lessonNumber, lessonsOfTopic, questionsOf } from "@/lib/progress";
import { useCourse } from "@/lib/store";
import type { CourseData, Lesson, QuizQuestion, Topic } from "@/lib/types";
import { normalizeUrl } from "@/lib/url";
import { IconChevron, IconDown, IconEdit, IconPlus, IconQuiz, IconTrash, IconUp } from "../icons";
import { Modal } from "../modal";
import { Button, Card, Field, PageHeader, Skeleton, cx, inputCls } from "../ui";

type Dialog =
  | { kind: "course" }
  | { kind: "topic"; topic?: Topic }
  | { kind: "lesson"; topicId: string; lesson?: Lesson }
  | { kind: "question"; lessonId: string; question?: QuizQuestion };

export function ManageScreen() {
  const { data, loading, error, mode } = useCourse();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);

  if (loading) return <Skeleton />;
  if (error) return <Card className="p-6 text-danger">{error}</Card>;

  return (
    <div>
      <PageHeader eyebrow="ניהול תוכן" title="ניהול הקורס">
        הוספה ועריכה של נושאים, שיעורים, קישורים ושאלות מבחן.
        {mode === "local" && (
          <span className="mt-1 block text-sm text-muted">
            Supabase לא מוגדר — השינויים נשמרים בדפדפן הזה בלבד.
          </span>
        )}
      </PageHeader>

      {!data ? (
        <Card className="p-8 text-center">
          <div className="text-lg font-semibold">עדיין אין קורס</div>
          <Button className="mt-4" onClick={() => setDialog({ kind: "course" })}>
            <IconPlus size={17} /> צור קורס
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <div className="text-xs font-medium text-muted">קורס</div>
              <div className="ut truncate text-lg font-semibold">{data.course.title}</div>
              {data.course.description && <div className="ut truncate text-sm text-ink-2">{data.course.description}</div>}
            </div>
            <Button variant="secondary" onClick={() => setDialog({ kind: "course" })}>
              <IconEdit size={16} /> ערוך פרטי קורס
            </Button>
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">נושאים ושיעורים</h2>
            <Button onClick={() => setDialog({ kind: "topic" })} data-testid="add-topic">
              <IconPlus size={17} /> הוסף נושא
            </Button>
          </div>

          {data.topics.length === 0 && (
            <Card className="p-8 text-center text-ink-2">אין עדיין נושאים. התחל בהוספת נושא.</Card>
          )}

          {data.topics.map((t, i) => (
            <TopicBlock key={t.id} data={data} topic={t} index={i} open={setDialog} />
          ))}
        </div>
      )}

      {dialog?.kind === "course" && <CourseDialog data={data} onClose={close} />}
      {dialog?.kind === "topic" && data && <TopicDialog courseId={data.course.id} topic={dialog.topic} onClose={close} />}
      {dialog?.kind === "lesson" && data && (
        <LessonDialog data={data} topicId={dialog.topicId} lesson={dialog.lesson} onClose={close} />
      )}
      {dialog?.kind === "question" && (
        <QuestionDialog lessonId={dialog.lessonId} question={dialog.question} onClose={close} />
      )}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cx(
        "grid size-9 place-items-center rounded-lg text-muted transition disabled:opacity-30",
        danger ? "hover:bg-danger-soft hover:text-danger" : "hover:bg-surface-2 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

const move = <T,>(arr: T[], from: number, to: number) => {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
};

function TopicBlock({
  data,
  topic,
  index,
  open,
}: {
  data: CourseData;
  topic: Topic;
  index: number;
  open: (d: Dialog) => void;
}) {
  const { actions } = useCourse();
  const lessons = lessonsOfTopic(data, topic.id);
  const [expanded, setExpanded] = useState<string | null>(null);
  const topicIds = data.topics.map((t) => t.id);
  const lessonIds = lessons.map((l) => l.id);

  return (
    <Card className="overflow-hidden" data-testid="manage-topic">
      <div className="flex items-center gap-2 border-b border-line bg-surface-2/50 px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="num text-xs text-muted">נושא {index + 1}</div>
          <div className="ut truncate font-semibold">{topic.title}</div>
        </div>
        <IconBtn label="הזז למעלה" disabled={index === 0} onClick={() => actions.reorderTopics(move(topicIds, index, index - 1))}>
          <IconUp size={18} />
        </IconBtn>
        <IconBtn
          label="הזז למטה"
          disabled={index === topicIds.length - 1}
          onClick={() => actions.reorderTopics(move(topicIds, index, index + 1))}
        >
          <IconDown size={18} />
        </IconBtn>
        <IconBtn label="ערוך נושא" onClick={() => open({ kind: "topic", topic })}>
          <IconEdit size={17} />
        </IconBtn>
        <IconBtn
          label="מחק נושא"
          danger
          onClick={() => {
            if (confirm(`למחוק את "${topic.title}" ואת כל ${lessons.length} השיעורים שבו?`)) void actions.deleteTopic(topic.id);
          }}
        >
          <IconTrash size={17} />
        </IconBtn>
      </div>

      <ul className="divide-y divide-line">
        {lessons.map((l, i) => {
          const qs = questionsOf(data, l.id);
          const isOpen = expanded === l.id;
          return (
            <li key={l.id} data-testid="manage-lesson">
              <div className="flex items-center gap-2 px-4 py-3 sm:px-5">
                <span className="num w-6 shrink-0 text-sm text-muted">{lessonNumber(data, l.id)}</span>
                <div className="min-w-0 flex-1">
                  <div className="ut truncate font-medium">{l.title}</div>
                  <div className="num truncate text-xs text-muted">
                    {l.duration_minutes} דק׳ · {l.learning_url ? "יש קישור" : "אין קישור"} · {qs.length} שאלות
                  </div>
                </div>
                <IconBtn label="הזז למעלה" disabled={i === 0} onClick={() => actions.reorderLessons(move(lessonIds, i, i - 1))}>
                  <IconUp size={18} />
                </IconBtn>
                <IconBtn
                  label="הזז למטה"
                  disabled={i === lessons.length - 1}
                  onClick={() => actions.reorderLessons(move(lessonIds, i, i + 1))}
                >
                  <IconDown size={18} />
                </IconBtn>
                <IconBtn label="ערוך שיעור" onClick={() => open({ kind: "lesson", topicId: topic.id, lesson: l })}>
                  <IconEdit size={17} />
                </IconBtn>
                <IconBtn label="שאלות מבחן" onClick={() => setExpanded(isOpen ? null : l.id)}>
                  <IconQuiz size={18} className={cx(isOpen && "text-accent")} />
                </IconBtn>
                <IconBtn
                  label="מחק שיעור"
                  danger
                  onClick={() => {
                    if (confirm(`למחוק את "${l.title}"? ההתקדמות, הציונים והסיכום שלו יימחקו.`)) void actions.deleteLesson(l.id);
                  }}
                >
                  <IconTrash size={17} />
                </IconBtn>
              </div>
              {isOpen && <QuestionsPanel lessonId={l.id} questions={qs} open={open} />}
            </li>
          );
        })}
      </ul>

      <div className="px-4 py-3 sm:px-5">
        <Button variant="ghost" size="sm" onClick={() => open({ kind: "lesson", topicId: topic.id })} data-testid="add-lesson">
          <IconPlus size={16} /> הוסף שיעור
        </Button>
      </div>
    </Card>
  );
}

function QuestionsPanel({ lessonId, questions, open }: { lessonId: string; questions: QuizQuestion[]; open: (d: Dialog) => void }) {
  const { actions } = useCourse();
  return (
    <div className="border-t border-dashed border-line bg-surface-2/40 px-4 py-4 anim-rise sm:px-5" data-testid="questions-panel">
      <div className="mb-3 text-sm font-semibold">שאלות מבחן</div>
      {questions.length === 0 && <div className="mb-3 text-sm text-muted">אין שאלות עדיין.</div>}
      <ol className="space-y-2">
        {questions.map((q, i) => (
          <li key={q.id} className="flex items-start gap-2 rounded-xl border border-line bg-surface px-3 py-2.5">
            <span className="num mt-0.5 text-sm text-muted">{i + 1}.</span>
            <div className="min-w-0 flex-1">
              <div className="ut text-sm font-medium">{q.question}</div>
              <div className="mt-0.5 truncate text-xs text-success">✓ {q.answers.find((a) => a.is_correct)?.answer}</div>
            </div>
            <IconBtn label="ערוך שאלה" onClick={() => open({ kind: "question", lessonId, question: q })}>
              <IconEdit size={16} />
            </IconBtn>
            <IconBtn
              label="מחק שאלה"
              danger
              onClick={() => {
                if (confirm("למחוק את השאלה?")) void actions.deleteQuestion(q.id);
              }}
            >
              <IconTrash size={16} />
            </IconBtn>
          </li>
        ))}
      </ol>
      <Button variant="secondary" size="sm" className="mt-3" onClick={() => open({ kind: "question", lessonId })} data-testid="add-question">
        <IconPlus size={16} /> הוסף שאלה
      </Button>
    </div>
  );
}

/* ---------------- dialogs ---------------- */

function FormActions({ saving, onCancel, submitLabel = "שמור" }: { saving: boolean; onCancel: () => void; submitLabel?: string }) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      <Button type="button" variant="ghost" onClick={onCancel}>
        ביטול
      </Button>
      <Button type="submit" disabled={saving} data-testid="dialog-submit">
        {submitLabel}
      </Button>
    </div>
  );
}

function useSubmit(onClose: () => void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setSaving(true);
    setError(null);
    try {
      await fn();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };
  return { saving, error, setError, run };
}

function CourseDialog({ data, onClose }: { data: CourseData | null; onClose: () => void }) {
  const { actions } = useCourse();
  const [title, setTitle] = useState(data?.course.title ?? "");
  const [description, setDescription] = useState(data?.course.description ?? "");
  const { saving, error, run } = useSubmit(onClose);
  return (
    <Modal title={data ? "עריכת קורס" : "קורס חדש"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(() =>
            data
              ? actions.updateCourse(data.course.id, { title: title.trim(), description: description.trim() })
              : actions.createCourse({ title: title.trim(), description: description.trim() }),
          );
        }}
        className="space-y-4"
      >
        <Field label="שם הקורס">
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} autoFocus />
        </Field>
        <Field label="תיאור">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <FormActions saving={saving} onCancel={onClose} />
      </form>
    </Modal>
  );
}

function TopicDialog({ courseId, topic, onClose }: { courseId: string; topic?: Topic; onClose: () => void }) {
  const { actions } = useCourse();
  const [title, setTitle] = useState(topic?.title ?? "");
  const [description, setDescription] = useState(topic?.description ?? "");
  const { saving, error, run } = useSubmit(onClose);
  return (
    <Modal title={topic ? "עריכת נושא" : "נושא חדש"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const input = { title: title.trim(), description: description.trim() };
          void run(() => (topic ? actions.updateTopic(topic.id, input) : actions.createTopic(courseId, input)));
        }}
        className="space-y-4"
      >
        <Field label="שם הנושא">
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} autoFocus data-testid="topic-title" />
        </Field>
        <Field label="תיאור">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <FormActions saving={saving} onCancel={onClose} />
      </form>
    </Modal>
  );
}

function LessonDialog({ data, topicId, lesson, onClose }: { data: CourseData; topicId: string; lesson?: Lesson; onClose: () => void }) {
  const { actions } = useCourse();
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [description, setDescription] = useState(lesson?.description ?? "");
  const [duration, setDuration] = useState(String(lesson?.duration_minutes ?? 60));
  const [url, setUrl] = useState(lesson?.learning_url ?? "");
  const [topic, setTopic] = useState(lesson?.topic_id ?? topicId);
  const { saving, error, setError, run } = useSubmit(onClose);

  return (
    <Modal title={lesson ? "עריכת שיעור" : "שיעור חדש"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const learning_url = url.trim() ? normalizeUrl(url) : null;
          if (url.trim() && !learning_url) return setError("הקישור לא נראה תקין");
          const input = {
            title: title.trim(),
            description: description.trim(),
            duration_minutes: Math.max(1, Number(duration) || 60),
            learning_url,
          };
          void run(() =>
            lesson ? actions.updateLesson(lesson.id, { ...input, topic_id: topic }) : actions.createLesson(topic, input),
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
            <input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} className={cx(inputCls, "num")} />
          </Field>
          <Field label="נושא">
            <div className="relative">
              <select value={topic} onChange={(e) => setTopic(e.target.value)} className={cx(inputCls, "appearance-none pe-9")}>
                {data.topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <IconChevron size={16} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 -rotate-90 text-muted" />
            </div>
          </Field>
        </div>
        <Field label="קישור לחומר לימוד" hint="YouTube, אתר, מאמר או מסמך (אופציונלי)">
          <input dir="ltr" inputMode="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} className={inputCls} data-testid="lesson-url" />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <FormActions saving={saving} onCancel={onClose} />
      </form>
    </Modal>
  );
}

function QuestionDialog({ lessonId, question, onClose }: { lessonId: string; question?: QuizQuestion; onClose: () => void }) {
  const { actions } = useCourse();
  const [text, setText] = useState(question?.question ?? "");
  const [answers, setAnswers] = useState<string[]>(() => {
    const a = question?.answers.map((x) => x.answer) ?? [];
    return [0, 1, 2, 3].map((i) => a[i] ?? "");
  });
  const [correct, setCorrect] = useState(() => Math.max(0, question?.answers.findIndex((a) => a.is_correct) ?? 0));
  const { saving, error, setError, run } = useSubmit(onClose);

  return (
    <Modal title={question ? "עריכת שאלה" : "שאלה חדשה"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (answers.some((a) => !a.trim())) return setError("יש למלא את כל ארבע התשובות");
          void run(() =>
            actions.saveQuestion(
              lessonId,
              { question: text.trim(), answers: answers.map((a, i) => ({ answer: a.trim(), is_correct: i === correct })) },
              question?.id,
            ),
          );
        }}
        className="space-y-4"
      >
        <Field label="השאלה">
          <textarea required value={text} onChange={(e) => setText(e.target.value)} rows={2} className={inputCls} autoFocus data-testid="question-text" />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink-2">תשובות · סמן את הנכונה</legend>
          <div className="space-y-2">
            {answers.map((a, i) => (
              <div
                key={i}
                className={cx(
                  "flex items-center gap-2 rounded-xl border p-1.5 pe-2 transition",
                  correct === i ? "border-success bg-success-soft" : "border-line",
                )}
              >
                <input
                  value={a}
                  onChange={(e) => setAnswers(answers.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={`תשובה ${i + 1}`}
                  className="min-w-0 flex-1 rounded-lg bg-transparent px-2.5 py-2 outline-none placeholder:text-muted"
                  data-testid="answer-input"
                />
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-ink-2">
                  <input type="radio" name="correct" checked={correct === i} onChange={() => setCorrect(i)} className="size-4 accent-[var(--success)]" />
                  נכונה
                </label>
              </div>
            ))}
          </div>
        </fieldset>
        {error && <p className="text-sm text-danger">{error}</p>}
        <FormActions saving={saving} onCancel={onClose} />
      </form>
    </Modal>
  );
}
