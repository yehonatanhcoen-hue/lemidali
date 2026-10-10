"use client";

import { useState } from "react";
import { useCourse } from "@/lib/store";
import type { Lesson, LessonProgress } from "@/lib/types";
import { KIND_LABEL, hostname, materialKind, normalizeUrl, youtubeId } from "@/lib/url";
import { IconCheck, IconEdit, IconExternal, IconFile, IconGlobe, IconLink, IconPlay, IconVideo } from "../icons";
import { Button, cx, inputCls } from "../ui";

export function MaterialSection({ lesson, progress }: { lesson: Lesson; progress: LessonProgress }) {
  const { actions } = useCourse();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const url = lesson.learning_url;

  const toggleDone = async () => {
    setBusy(true);
    const next = !progress.material_completed;
    await actions.upsertProgress(lesson.id, {
      material_completed: next,
      ...(progress.status === "not_started" ? { status: "in_progress" } : {}),
    });
    setBusy(false);
  };

  return (
    <div className="space-y-5">
      {url && !editing ? (
        <MaterialCard url={url} onEdit={() => setEditing(true)} />
      ) : (
        <UrlForm
          initial={url ?? ""}
          onCancel={url ? () => setEditing(false) : undefined}
          onSave={async (value) => {
            await actions.updateLesson(lesson.id, { learning_url: value });
            setEditing(false);
          }}
        />
      )}

      <button
        onClick={toggleDone}
        disabled={busy}
        aria-pressed={progress.material_completed}
        data-testid="material-done"
        className={cx(
          "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-start transition active:scale-[0.99]",
          progress.material_completed
            ? "border-success/40 bg-success-soft text-success"
            : "border-line bg-surface hover:border-accent/50 hover:bg-surface-2",
        )}
      >
        <span
          className={cx(
            "grid size-6 shrink-0 place-items-center rounded-md border-2 transition",
            progress.material_completed ? "border-success bg-success text-white" : "border-line",
          )}
        >
          {progress.material_completed && <IconCheck size={14} strokeWidth={3} className="anim-pop" />}
        </span>
        <span className="font-medium">השלמתי את חומר הלימוד</span>
        {progress.material_completed && <span className="ms-auto text-sm opacity-80">השלב הבא זמין ↓</span>}
      </button>
    </div>
  );
}

function MaterialCard({ url, onEdit }: { url: string; onEdit: () => void }) {
  const kind = materialKind(url);
  const yt = youtubeId(url);
  const KindIcon = kind === "youtube" ? IconVideo : kind === "web" ? IconGlobe : IconFile;
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface-2/50 sm:flex" data-testid="material-card">
      {yt ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="group relative block aspect-video bg-black sm:w-64 sm:shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote thumbnail, no optimization needed */}
          <img
            src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`}
            alt=""
            className="size-full object-cover opacity-90 transition group-hover:opacity-100"
          />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-12 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition group-hover:scale-110">
              <IconPlay size={20} />
            </span>
          </span>
        </a>
      ) : (
        <div className="grid h-28 place-items-center bg-accent-soft text-accent sm:h-auto sm:w-40 sm:shrink-0">
          <KindIcon size={36} strokeWidth={1.5} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted">{KIND_LABEL[kind]}</div>
          <div className="mt-0.5 truncate font-semibold">{hostname(url)}</div>
          <div className="mt-0.5 truncate text-sm text-muted" dir="ltr" style={{ textAlign: "right" }}>
            {url}
          </div>
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-medium text-accent-ink transition hover:brightness-110 active:scale-[0.98]"
            data-testid="open-material"
          >
            <IconExternal size={17} />
            פתח חומר לימוד
          </a>
          <Button variant="ghost" onClick={onEdit}>
            <IconEdit size={16} />
            ערוך קישור
          </Button>
        </div>
      </div>
    </div>
  );
}

function UrlForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (url: string | null) => Promise<void>;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    const url = trimmed ? normalizeUrl(trimmed) : null;
    if (trimmed && !url) return setError("הכתובת לא נראית תקינה");
    setSaving(true);
    await onSave(url);
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-dashed border-line p-4 sm:p-5">
      <label htmlFor="learning-url" className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-2">
        <IconLink size={17} />
        קישור לחומר הלימוד
      </label>
      <p className="mb-3 text-xs text-muted">סרטון YouTube, אתר, מאמר או מסמך</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="learning-url"
          type="text"
          inputMode="url"
          dir="ltr"
          placeholder="https://"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          className={cx(inputCls, "flex-1")}
          data-testid="url-input"
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="flex-1 sm:flex-none">
            שמור
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              ביטול
            </Button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </form>
  );
}
