"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { dataToFile } from "@/lib/course-file/plan";
import { reorder, type QuizOwner } from "@/lib/edit";
import { downloadText } from "@/lib/importer";
import { lessonNumber, lessonQuiz, lessonsOfTopic, materialsOf, questionsOf, topicExam } from "@/lib/progress";
import { QUESTION_TYPE_LABEL } from "@/lib/quiz";
import { useAuth } from "@/lib/auth";
import { useCourse } from "@/lib/store";
import type { CourseData, CourseSummary, Lesson, LessonMaterial, QuizQuestion, Topic } from "@/lib/types";
import { IconDown, IconDownload, IconEdit, IconLink, IconPlus, IconQuiz, IconTrash, IconTrophy, IconUp } from "../icons";
import { MATERIAL_LABEL } from "../lesson/material";
import { CourseDialog, LessonDialog, MaterialDialog, QuestionDialog, TopicDialog } from "../manage/dialogs";
import { ImportCard } from "../manage/import-card";
import { Button, Card, PageHeader, Skeleton, cx } from "../ui";

type Dialog =
  | { kind: "course"; create?: boolean }
  | { kind: "topic"; topic?: Topic }
  | { kind: "lesson"; topicId: string; lesson?: Lesson }
  | { kind: "material"; lessonId: string; material?: LessonMaterial }
  | { kind: "question"; owner: QuizOwner; question?: QuizQuestion };

type Open = (d: Dialog) => void;

export function ManageScreen() {
  const { data, loading, error, mode, repo } = useCourse();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const close = () => setDialog(null);
  // close dialogs when navigating away (the page stays mounted but hidden)
  useLayoutEffect(() => () => setDialog(null), []);

  useEffect(() => {
    repo.listCourses().then(setCourses).catch(() => setCourses([]));
  }, [repo, data]);

  if (loading) return <Skeleton />;
  if (error) return <Card className="p-6 text-danger">{error}</Card>;

  return (
    <div>
      <PageHeader eyebrow="ניהול תוכן" title="ניהול הקורס">
        ייבוא קורס מקובץ, ועריכה ידנית של נושאים, שיעורים, חומרים ושאלות.
        {mode === "local" && <span className="mt-1 block text-sm text-muted">Supabase לא מוגדר — השינויים נשמרים בדפדפן הזה בלבד.</span>}
      </PageHeader>

      <div className="space-y-6">
        <ImportCard />

        {courses.length > 1 && <CourseSwitcher courses={courses} activeId={data?.course.id} />}

        {data ? (
          <>
            <CourseCard data={data} open={setDialog} />
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">נושאים ושיעורים</h2>
              <Button onClick={() => setDialog({ kind: "topic" })} data-testid="add-topic">
                <IconPlus size={17} /> הוסף נושא
              </Button>
            </div>
            {data.topics.length === 0 && <Card className="p-8 text-center text-ink-2">אין עדיין נושאים. התחל בהוספת נושא או ייבא קובץ.</Card>}
            {data.topics.map((t, i) => (
              <TopicBlock key={t.id} data={data} topic={t} index={i} open={setDialog} />
            ))}
          </>
        ) : (
          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <span className="text-ink-2">או צור קורס ריק ובנה אותו ידנית.</span>
            <Button variant="secondary" onClick={() => setDialog({ kind: "course", create: true })}>
              <IconPlus size={17} /> קורס ריק
            </Button>
          </Card>
        )}
      </div>

      <AccountCard />

      {dialog?.kind === "course" && <CourseDialog data={dialog.create ? null : data} onClose={close} />}
      {data && dialog?.kind === "topic" && <TopicDialog data={data} topic={dialog.topic} onClose={close} />}
      {data && dialog?.kind === "lesson" && <LessonDialog data={data} topicId={dialog.topicId} lesson={dialog.lesson} onClose={close} />}
      {data && dialog?.kind === "material" && <MaterialDialog data={data} lessonId={dialog.lessonId} material={dialog.material} onClose={close} />}
      {data && dialog?.kind === "question" && <QuestionDialog data={data} owner={dialog.owner} question={dialog.question} onClose={close} />}
    </div>
  );
}

function CourseSwitcher({ courses, activeId }: { courses: CourseSummary[]; activeId?: string }) {
  const { run } = useCourse();
  return (
    <Card className="overflow-hidden" data-testid="course-switcher">
      <div className="border-b border-line px-5 py-3 text-sm font-semibold">הקורסים שלי</div>
      <ul className="divide-y divide-line">
        {courses.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-5 py-3">
            <span className="ut min-w-0 flex-1 truncate font-medium">{c.title}</span>
            {c.id === activeId ? (
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">פעיל</span>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => void run((r) => r.setActiveCourse(c.id))}>
                הפעל
              </Button>
            )}
            <IconBtn
              label="מחק קורס"
              danger
              onClick={() => {
                if (confirm(`למחוק את הקורס "${c.title}" וכל ההתקדמות שבו? אי אפשר לבטל.`)) void run((r) => r.remove("courses", [c.id]));
              }}
            >
              <IconTrash size={17} />
            </IconBtn>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CourseCard({ data, open }: { data: CourseData; open: Open }) {
  const c = data.course;
  return (
    <Card className="p-5" data-testid="course-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted">קורס פעיל</div>
          <div className="ut truncate text-lg font-semibold">{c.title}</div>
          <div className="num mt-1 text-sm text-ink-2">
            ציון עובר {c.passing_score}% · {c.lock_until_passed ? "נעילה לפי ציון פעילה" : "ללא נעילה"} ·{" "}
            <span dir="ltr" className="text-muted">
              key: {c.key}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => open({ kind: "course" })} data-testid="edit-course">
            <IconEdit size={16} /> הגדרות
          </Button>
          <Button
            variant="secondary"
            onClick={() => downloadText(`${c.key}.json`, JSON.stringify(dataToFile(data), null, 2))}
            data-testid="export-course"
          >
            <IconDownload size={16} /> ייצוא JSON
          </Button>
        </div>
      </div>
    </Card>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  danger,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cx(
        "grid size-9 shrink-0 place-items-center rounded-lg transition disabled:opacity-30",
        active ? "bg-accent-soft text-accent" : "text-muted",
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

function TopicBlock({ data, topic, index, open }: { data: CourseData; topic: Topic; index: number; open: Open }) {
  const { run } = useCourse();
  const lessons = lessonsOfTopic(data, topic.id);
  const [panel, setPanel] = useState<{ id: string; kind: "materials" | "questions" } | null>(null);
  const exam = topicExam(data, topic.id);
  const examQuestions = questionsOf(data, exam?.id);
  const examOpen = panel?.id === topic.id;

  return (
    <Card className="overflow-hidden" data-testid="manage-topic">
      <div className="flex items-center gap-1 border-b border-line bg-surface-2/50 px-3 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="num text-xs text-muted">נושא {index + 1}</div>
          <div className="ut truncate font-semibold">{topic.title}</div>
        </div>
        <IconBtn label="הזז למעלה" disabled={index === 0} onClick={() => void run((r) => reorder(r, "topics", move(data.topics, index, index - 1)))}>
          <IconUp size={18} />
        </IconBtn>
        <IconBtn label="הזז למטה" disabled={index === data.topics.length - 1} onClick={() => void run((r) => reorder(r, "topics", move(data.topics, index, index + 1)))}>
          <IconDown size={18} />
        </IconBtn>
        <IconBtn label="ערוך נושא" onClick={() => open({ kind: "topic", topic })}>
          <IconEdit size={17} />
        </IconBtn>
        <IconBtn
          label="מחק נושא"
          danger
          onClick={() => {
            if (confirm(`למחוק את "${topic.title}" ואת כל ${lessons.length} השיעורים שבו?`)) void run((r) => r.remove("topics", [topic.id]));
          }}
        >
          <IconTrash size={17} />
        </IconBtn>
      </div>

      <ul className="divide-y divide-line">
        {lessons.map((l, i) => {
          const mats = materialsOf(data, l.id);
          const qs = questionsOf(data, lessonQuiz(data, l.id)?.id);
          const isOpen = panel?.id === l.id ? panel.kind : null;
          return (
            <li key={l.id} data-testid="manage-lesson">
              <div className="flex items-center gap-1 px-3 py-3 sm:px-5">
                <span className="num w-7 shrink-0 text-sm text-muted">{lessonNumber(data, l.id)}</span>
                <div className="min-w-0 flex-1">
                  <div className="ut truncate font-medium">{l.title}</div>
                  <div className="num truncate text-xs text-muted">
                    {l.duration_minutes} דק׳ · {mats.length} חומרים · {qs.length} שאלות
                  </div>
                </div>
                <IconBtn label="הזז למעלה" disabled={i === 0} onClick={() => void run((r) => reorder(r, "lessons", move(lessons, i, i - 1)))}>
                  <IconUp size={18} />
                </IconBtn>
                <IconBtn label="הזז למטה" disabled={i === lessons.length - 1} onClick={() => void run((r) => reorder(r, "lessons", move(lessons, i, i + 1)))}>
                  <IconDown size={18} />
                </IconBtn>
                <IconBtn label="ערוך שיעור" onClick={() => open({ kind: "lesson", topicId: topic.id, lesson: l })}>
                  <IconEdit size={17} />
                </IconBtn>
                <IconBtn label="חומרי לימוד" active={isOpen === "materials"} onClick={() => setPanel(isOpen === "materials" ? null : { id: l.id, kind: "materials" })}>
                  <IconLink size={17} />
                </IconBtn>
                <IconBtn label="שאלות מבחן" active={isOpen === "questions"} onClick={() => setPanel(isOpen === "questions" ? null : { id: l.id, kind: "questions" })}>
                  <IconQuiz size={18} />
                </IconBtn>
                <IconBtn
                  label="מחק שיעור"
                  danger
                  onClick={() => {
                    if (confirm(`למחוק את "${l.title}"? ההתקדמות, הציונים והסיכום שלו יימחקו.`)) void run((r) => r.remove("lessons", [l.id]));
                  }}
                >
                  <IconTrash size={17} />
                </IconBtn>
              </div>
              {isOpen === "materials" && <MaterialsPanel lessonId={l.id} materials={mats} open={open} />}
              {isOpen === "questions" && <QuestionsPanel title="שאלות מבחן השיעור" owner={{ lessonId: l.id }} questions={qs} open={open} />}
            </li>
          );
        })}
        {examOpen && <li><QuestionsPanel title="מבחן סיכום הנושא" owner={{ topicId: topic.id }} questions={examQuestions} open={open} /></li>}
      </ul>

      <div className="flex flex-wrap gap-2 border-t border-line px-3 py-3 sm:px-5">
        <Button variant="ghost" size="sm" onClick={() => open({ kind: "lesson", topicId: topic.id })} data-testid="add-lesson">
          <IconPlus size={16} /> הוסף שיעור
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setPanel(examOpen ? null : { id: topic.id, kind: "questions" })} data-testid="toggle-exam">
          <IconTrophy size={16} /> מבחן סיכום ({examQuestions.length})
        </Button>
      </div>
    </Card>
  );
}

function MaterialsPanel({ lessonId, materials, open }: { lessonId: string; materials: LessonMaterial[]; open: Open }) {
  const { run } = useCourse();
  return (
    <div className="border-t border-dashed border-line bg-surface-2/40 px-4 py-4 anim-rise sm:px-5" data-testid="materials-panel">
      <div className="mb-3 text-sm font-semibold">חומרי לימוד</div>
      {materials.length === 0 && <div className="mb-3 text-sm text-muted">אין חומרים עדיין.</div>}
      <ul className="space-y-2">
        {materials.map((m, i) => (
          <li key={m.id} className="flex items-center gap-1 rounded-xl border border-line bg-surface px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="ut truncate text-sm font-medium">{m.title}</div>
              <div className="num truncate text-xs text-muted" dir="ltr" style={{ textAlign: "right" }}>
                {MATERIAL_LABEL[m.type]} · {m.url}
              </div>
            </div>
            <IconBtn label="הזז למעלה" disabled={i === 0} onClick={() => void run((r) => reorder(r, "lesson_materials", move(materials, i, i - 1)))}>
              <IconUp size={16} />
            </IconBtn>
            <IconBtn label="ערוך חומר" onClick={() => open({ kind: "material", lessonId, material: m })}>
              <IconEdit size={16} />
            </IconBtn>
            <IconBtn label="מחק חומר" danger onClick={() => confirm("למחוק את החומר?") && void run((r) => r.remove("lesson_materials", [m.id]))}>
              <IconTrash size={16} />
            </IconBtn>
          </li>
        ))}
      </ul>
      <Button variant="secondary" size="sm" className="mt-3" onClick={() => open({ kind: "material", lessonId })} data-testid="add-material">
        <IconPlus size={16} /> הוסף חומר
      </Button>
    </div>
  );
}

function QuestionsPanel({ title, owner, questions, open }: { title: string; owner: QuizOwner; questions: QuizQuestion[]; open: Open }) {
  const { run } = useCourse();
  return (
    <div className="border-t border-dashed border-line bg-surface-2/40 px-4 py-4 anim-rise sm:px-5" data-testid="questions-panel">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      {questions.length === 0 && <div className="mb-3 text-sm text-muted">אין שאלות עדיין.</div>}
      <ol className="space-y-2">
        {questions.map((q, i) => {
          const correct =
            q.type === "open" ? q.model_answer : q.options.filter((o) => o.is_correct).map((o) => o.text).join(", ");
          return (
            <li key={q.id} className="flex items-start gap-1 rounded-xl border border-line bg-surface px-3 py-2.5">
              <span className="num mt-0.5 w-5 text-sm text-muted">{i + 1}.</span>
              <div className="min-w-0 flex-1">
                <div className="ut text-sm font-medium">{q.question}</div>
                <div className="mt-0.5 truncate text-xs">
                  <span className="text-muted">{QUESTION_TYPE_LABEL[q.type]} · </span>
                  <span className="ut text-success">✓ {correct}</span>
                </div>
              </div>
              <IconBtn label="ערוך שאלה" onClick={() => open({ kind: "question", owner, question: q })}>
                <IconEdit size={16} />
              </IconBtn>
              <IconBtn label="מחק שאלה" danger onClick={() => confirm("למחוק את השאלה?") && void run((r) => r.remove("quiz_questions", [q.id]))}>
                <IconTrash size={16} />
              </IconBtn>
            </li>
          );
        })}
      </ol>
      <Button variant="secondary" size="sm" className="mt-3" onClick={() => open({ kind: "question", owner })} data-testid="add-question">
        <IconPlus size={16} /> הוסף שאלה
      </Button>
    </div>
  );
}

function AccountCard() {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  return (
    <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 p-5" data-testid="account-card">
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink-2">מחובר כ-</div>
        <bdi className="block truncate font-semibold" dir="ltr">
          {user.email}
        </bdi>
        <div className="mt-1 text-sm text-muted">הקורסים וההתקדמות נשמרים בחשבון וזמינים בכל מכשיר שמתחבר אליו.</div>
      </div>
      <Button
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await signOut();
        }}
        data-testid="sign-out"
      >
        התנתק
      </Button>
    </Card>
  );
}
