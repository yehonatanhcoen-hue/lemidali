"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fileToRows } from "@/lib/course-file/plan";
import { previewImport, type ImportPreview } from "@/lib/course-file/preview";
import { parseCourseText } from "@/lib/course-file/validate";
import { GUIDE_URL, TEMPLATE_URL, downloadText, importDemo } from "@/lib/importer";
import { useCourse } from "@/lib/store";
import type { ContentRows } from "@/lib/types";
import { IconCheck, IconCopy, IconDownload, IconFile, IconUpload, IconX } from "../icons";
import { Modal } from "../modal";
import { Button, Card, cx } from "../ui";

type State =
  | { kind: "idle" }
  | { kind: "paste" }
  | { kind: "errors"; errors: string[] }
  | { kind: "preview"; rows: ContentRows; preview: ImportPreview }
  | { kind: "done"; title: string };

export function ImportCard() {
  const { repo, run } = useCourse();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const [guide, setGuide] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => () => setState({ kind: "idle" }), []);

  // Prefetched so "copy" runs inside the tap (iPad Safari requires a user gesture).
  useEffect(() => {
    fetch(GUIDE_URL)
      .then((r) => r.text())
      .then(setGuide)
      .catch(() => setGuide(null));
  }, []);

  const handleText = async (text: string) => {
    const parsed = parseCourseText(text);
    if (!parsed.ok) return setState({ kind: "errors", errors: parsed.errors });
    const rows = fileToRows(parsed.file);
    setBusy(true);
    try {
      const current = await repo.load(rows.course.id);
      setState({ kind: "preview", rows, preview: previewImport(rows, current) });
    } catch (e) {
      setState({ kind: "errors", errors: [e instanceof Error ? e.message : String(e)] });
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (rows: ContentRows) => {
    setBusy(true);
    try {
      await run((r) => r.importCourse(rows));
      setState({ kind: "done", title: rows.course.title });
    } catch (e) {
      setState({ kind: "errors", errors: [`הייבוא נכשל: ${e instanceof Error ? e.message : String(e)}`] });
    } finally {
      setBusy(false);
    }
  };

  const copyGuide = async () => {
    if (!guide) return;
    try {
      await navigator.clipboard.writeText(guide);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      downloadText("course-format.md", guide, "text/markdown");
    }
  };

  return (
    <Card id="import" className="scroll-mt-6 p-5 sm:p-6" data-testid="import-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">ייבוא קורס</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-2">
            קובץ JSON אחד מכיל את כל הקורס: נושאים, שיעורים, חומרים ומבחנים. ייבוא חוזר של אותו קורס מעדכן אותו ושומר את ההתקדמות.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => fileInput.current?.click()} disabled={busy} data-testid="import-file">
            <IconUpload size={17} /> בחר קובץ
          </Button>
          <Button variant="secondary" onClick={() => setState({ kind: "paste" })} disabled={busy} data-testid="import-paste">
            הדבק JSON
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json,text/plain"
            className="hidden"
            data-testid="import-input"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) await handleText(await f.text());
            }}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4 text-sm">
        <span className="text-muted">איך בונים קובץ?</span>
        <button onClick={copyGuide} disabled={!guide} className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline disabled:opacity-50" data-testid="copy-guide">
          {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
          {copied ? "הועתק — הדבק בצ׳אט חדש וכתוב מה תרצה ללמוד" : "העתק הוראות לצ׳אט AI"}
        </button>
        <a href={GUIDE_URL} download="course-format.md" className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline">
          <IconFile size={15} /> הורד הוראות
        </a>
        <a href={TEMPLATE_URL} download="course-template.json" className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline">
          <IconDownload size={15} /> הורד תבנית
        </a>
        <button
          onClick={async () => {
            setBusy(true);
            await run((r) => importDemo(r));
            setBusy(false);
            setState({ kind: "done", title: "קורס הדמו" });
          }}
          className="font-medium text-ink-2 hover:text-ink hover:underline"
          data-testid="manage-load-demo"
        >
          טען קורס דמו
        </button>
      </div>

      {state.kind === "paste" && <PasteDialog onClose={() => setState({ kind: "idle" })} onSubmit={handleText} busy={busy} />}
      {state.kind === "errors" && <ErrorsDialog errors={state.errors} onClose={() => setState({ kind: "idle" })} />}
      {state.kind === "preview" && (
        <PreviewDialog preview={state.preview} busy={busy} onClose={() => setState({ kind: "idle" })} onConfirm={() => void confirm(state.rows)} />
      )}
      {state.kind === "done" && (
        <Modal title="הייבוא הושלם" onClose={() => setState({ kind: "idle" })}>
          <div className="text-center" data-testid="import-done">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-success text-white anim-pop">
              <IconCheck size={28} strokeWidth={2.6} />
            </span>
            <p className="ut mt-4 font-semibold">{state.title}</p>
            <p className="mt-1 text-sm text-ink-2">הקורס פעיל ומוכן ללמידה.</p>
            <div className="mt-6 flex justify-center gap-2">
              <Link href="/" className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-medium text-accent-ink">
                לדף הבית
              </Link>
              <Button variant="ghost" onClick={() => setState({ kind: "idle" })}>
                סגור
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}

function PasteDialog({ onClose, onSubmit, busy }: { onClose: () => void; onSubmit: (text: string) => void; busy: boolean }) {
  const [text, setText] = useState("");
  return (
    <Modal title="הדבקת קובץ קורס" onClose={onClose}>
      <p className="mb-3 text-sm text-ink-2">אפשר להדביק את כל התשובה מהצ׳אט — גם עם ```json מסביב.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        dir="ltr"
        rows={12}
        placeholder='{ "format": "lemidali-course", ... }'
        className="block w-full rounded-xl border border-line bg-surface p-3 font-mono text-xs outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
        data-testid="paste-input"
        autoFocus
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          ביטול
        </Button>
        <Button onClick={() => onSubmit(text)} disabled={!text.trim() || busy} data-testid="paste-submit">
          בדוק
        </Button>
      </div>
    </Modal>
  );
}

function ErrorsDialog({ errors, onClose }: { errors: string[]; onClose: () => void }) {
  return (
    <Modal title="הקובץ לא תקין" onClose={onClose}>
      <p className="mb-3 text-sm text-ink-2">שום דבר לא יובא. תקן את הבעיות ונסה שוב (אפשר להדביק את הרשימה לצ׳אט שבנה את הקובץ):</p>
      <ul className="max-h-[50dvh] space-y-1.5 overflow-y-auto" data-testid="import-errors">
        {errors.map((e, i) => (
          <li key={i} className="flex gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-ink">
            <IconX size={16} className="mt-0.5 shrink-0 text-danger" />
            <span className="ut">{e}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => void navigator.clipboard?.writeText(errors.join("\n")).catch(() => {})}>
          <IconCopy size={15} /> העתק שגיאות
        </Button>
        <Button onClick={onClose}>הבנתי</Button>
      </div>
    </Modal>
  );
}

function PreviewDialog({
  preview: p,
  busy,
  onClose,
  onConfirm,
}: {
  preview: ImportPreview;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const removedAny = p.removed.topics.length + p.removed.lessons.length + p.removed.questions + p.removed.materials > 0;
  const hours = Math.round((p.counts.minutes / 60) * 10) / 10;
  return (
    <Modal title={p.isNew ? "ייבוא קורס חדש" : "עדכון קורס קיים"} onClose={onClose}>
      <div className="space-y-4" data-testid="import-preview">
        <div className="ut text-lg font-semibold">{p.title}</div>
        <div className="num grid grid-cols-3 gap-2 text-center">
          {[
            ["נושאים", p.counts.topics],
            ["שיעורים", p.counts.lessons],
            ["שאלות", p.counts.questions],
            ["חומרים", p.counts.materials],
            ["מבחני סיכום", p.counts.exams],
            ["שעות", hours],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-surface-2 px-2 py-2.5">
              <div className="text-lg font-bold">{value}</div>
              <div className="text-xs text-muted">{label}</div>
            </div>
          ))}
        </div>

        {!p.isNew && (
          <div className="num space-y-1 text-sm">
            <div className="text-ink-2">
              יתעדכנו {p.updatedLessons} שיעורים קיימים (ההתקדמות נשמרת)
              {p.added.lessons > 0 && ` · ${p.added.lessons} שיעורים חדשים`}
              {p.added.questions > 0 && ` · ${p.added.questions} שאלות חדשות`}
            </div>
          </div>
        )}

        {removedAny && (
          <div className={cx("rounded-xl px-4 py-3 text-sm", p.losesProgress ? "bg-danger-soft" : "bg-warn-soft")} data-testid="import-removals">
            <div className={cx("font-semibold", p.losesProgress ? "text-danger" : "text-warn")}>יימחקו כי הם לא בקובץ:</div>
            <ul className="num mt-1 list-inside list-disc space-y-0.5 text-ink">
              {p.removed.topics.map((t) => (
                <li key={t}>נושא: {t}</li>
              ))}
              {p.removed.lessons.map((l) => (
                <li key={l.title}>
                  שיעור: {l.title}
                  {l.hasProgress && <span className="font-semibold text-danger"> (כולל ההתקדמות שלך)</span>}
                </li>
              ))}
              {p.removed.questions > 0 && <li>{p.removed.questions} שאלות</li>}
              {p.removed.materials > 0 && <li>{p.removed.materials} חומרי לימוד</li>}
            </ul>
            {p.losesProgress && <p className="mt-2 text-xs text-ink-2">אם שינית key בטעות — תקן אותו בקובץ, וההתקדמות תישמר.</p>}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            ביטול
          </Button>
          <Button variant={p.losesProgress ? "danger" : "primary"} onClick={onConfirm} disabled={busy} data-testid="import-confirm" className={p.losesProgress ? "border border-danger" : ""}>
            {p.isNew ? "ייבא קורס" : "עדכן קורס"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
