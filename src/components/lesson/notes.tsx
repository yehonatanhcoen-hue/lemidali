"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCourse } from "@/lib/store";
import type { LessonAttachment } from "@/lib/types";
import { IconFile, IconTrash, IconUpload } from "../icons";
import { Button, cx } from "../ui";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const time = (iso: string) => new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

export function NotesSection({
  lessonId,
  initial,
  updatedAt,
  attachments,
}: {
  lessonId: string;
  initial: string;
  updatedAt: string | null;
  attachments: LessonAttachment[];
}) {
  const { saveNote } = useCourse();
  const [text, setText] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState(updatedAt);
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const value = pending.current;
    if (value === null) return;
    pending.current = null;
    setState("saving");
    try {
      await saveNote(lessonId, value);
      setSavedAt(new Date().toISOString());
      setState(pending.current === null ? "saved" : "dirty");
    } catch {
      pending.current ??= value;
      setState("error");
    }
  }, [lessonId, saveNote]);

  // Save whatever is pending when leaving the page.
  useEffect(() => () => void flush(), [flush]);

  const onChange = (value: string) => {
    setText(value);
    pending.current = value;
    setState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 800);
  };

  const label =
    state === "saving"
      ? "שומר…"
      : state === "dirty"
        ? "שינויים לא שמורים"
        : state === "error"
          ? "השמירה נכשלה"
          : savedAt
            ? `נשמר ${time(savedAt)}`
            : "שמירה אוטומטית";

  return (
    <div className="space-y-6">
      <div>
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => void flush()}
          placeholder="מה הדברים החשובים שלמדת בשיעור הזה?"
          rows={10}
          className="block min-h-56 w-full resize-y rounded-xl border border-line bg-surface p-4 leading-relaxed text-ink outline-none transition placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/15"
          data-testid="notes-input"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span
            className={cx(
              "num text-sm transition-colors",
              state === "error" ? "text-danger" : state === "saved" ? "text-success" : "text-muted",
            )}
            data-testid="notes-status"
            aria-live="polite"
          >
            {label}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              pending.current = text;
              void flush();
            }}
            disabled={state === "saving"}
            data-testid="notes-save"
          >
            שמור
          </Button>
        </div>
      </div>

      <FilesArea attachments={attachments} />
    </div>
  );
}

function FilesArea({ attachments }: { attachments: LessonAttachment[] }) {
  const { run } = useCourse();
  return (
    <div>
      <h3 className="mb-2 font-semibold">קבצים</h3>
      {/*
        TODO(storage): enable once a Supabase Storage bucket is connected.
        Wire the input's onChange to run((repo) => repo.uploadAttachment(lessonId, file))
        and implement uploadAttachment in src/lib/repo/supabase.ts.
      */}
      <div
        className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line px-4 py-7 text-center"
        aria-disabled
        data-testid="files-area"
      >
        <IconUpload size={26} className="text-muted" />
        <div className="text-sm font-medium text-ink-2">צירוף PDF, תמונה או מסמך</div>
        <div className="text-xs text-muted">יתאפשר לאחר חיבור אחסון קבצים (שלב הבא)</div>
        <span className="mt-1 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-muted">בקרוב</span>
      </div>
      {attachments.length > 0 && (
        <ul className="mt-3 space-y-2">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
              <IconFile size={18} className="text-muted" />
              <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm hover:text-accent">
                {a.file_name}
              </a>
              <button
                onClick={() => void run((repo) => repo.deleteAttachment(a.id))}
                className="text-muted hover:text-danger"
                aria-label="מחק קובץ"
              >
                <IconTrash size={17} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
