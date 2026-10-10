"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import { useCourse } from "@/lib/store";
import type { LessonMaterial, LessonProgress, MaterialType } from "@/lib/types";
import { hostname, youtubeId } from "@/lib/url";
import { IconArticle, IconCheck, IconClock, IconExternal, IconFile, IconLink, IconPlay, IconVideo, IconX } from "../icons";
import { cx } from "../ui";

export const MATERIAL_LABEL: Record<MaterialType, string> = {
  video: "סרטון",
  article: "מאמר",
  pdf: "PDF",
  document: "מסמך",
  link: "קישור",
};

const ICON: Record<MaterialType, typeof IconLink> = {
  video: IconVideo,
  article: IconArticle,
  pdf: IconFile,
  document: IconFile,
  link: IconLink,
};

export function MaterialSection({
  lessonId,
  materials,
  views,
  progress,
}: {
  lessonId: string;
  materials: LessonMaterial[];
  views: Record<string, string>;
  progress: LessonProgress;
}) {
  const { run } = useCourse();
  const [busy, setBusy] = useState(false);
  const viewedCount = materials.filter((m) => views[m.id]).length;
  const minutes = materials.reduce((s, m) => s + (m.duration_minutes ?? 0), 0);

  /** Marking a material keeps lesson_progress.material_completed in sync (all viewed ⇔ done). */
  const setViewed = async (m: LessonMaterial, viewed: boolean) => {
    setBusy(true);
    const allViewed = materials.every((x) => (x.id === m.id ? viewed : Boolean(views[x.id])));
    await run(async (repo) => {
      await repo.setMaterialViewed(m.id, viewed);
      if (allViewed !== progress.material_completed || progress.status === "not_started")
        await repo.upsertProgress(lessonId, {
          material_completed: allViewed,
          ...(progress.status === "not_started" ? { status: "in_progress" } : {}),
        });
    });
    setBusy(false);
  };

  const toggleManual = async () => {
    setBusy(true);
    await run((repo) =>
      repo.upsertProgress(lessonId, {
        material_completed: !progress.material_completed,
        ...(progress.status === "not_started" ? { status: "in_progress" } : {}),
      }),
    );
    setBusy(false);
  };

  if (materials.length === 0)
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-dashed border-line px-5 py-6 text-center text-sm text-muted">
          אין חומרי לימוד לשיעור הזה. אפשר להוסיף בקובץ הקורס או ב
          <Link href="/manage" className="text-accent hover:underline">
            עמוד הניהול
          </Link>
          .
        </div>
        <DoneToggle checked={progress.material_completed} onClick={toggleManual} disabled={busy} label="השלמתי את חומר הלימוד" />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="num flex flex-wrap items-center justify-between gap-2 text-sm text-ink-2">
        <span>
          {materials.length} פריטים{minutes > 0 && ` · כ-${minutes} דק׳`}
        </span>
        <span className={cx(viewedCount === materials.length ? "text-success" : "text-muted")} data-testid="materials-count">
          נצפו {viewedCount} מתוך {materials.length}
        </span>
      </div>
      <ul className="space-y-3">
        {materials.map((m) => (
          <MaterialItem key={m.id} m={m} viewed={Boolean(views[m.id])} busy={busy} onViewed={(v) => void setViewed(m, v)} />
        ))}
      </ul>
      {progress.material_completed && (
        <div className="rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success anim-rise" data-testid="material-done-banner">
          ✓ סיימת את חומר הלימוד — השלב הבא זמין
        </div>
      )}
    </div>
  );
}

function MaterialItem({
  m,
  viewed,
  busy,
  onViewed,
}: {
  m: LessonMaterial;
  viewed: boolean;
  busy: boolean;
  onViewed: (v: boolean) => void;
}) {
  const yt = m.type === "video" ? youtubeId(m.url) : null;
  const [playing, setPlaying] = useState(false);
  const Icon = ICON[m.type];
  // Next.js keeps visited pages mounted but hidden (<Activity>); stop the video when this page is hidden.
  useLayoutEffect(() => () => setPlaying(false), []);

  return (
    <li
      className={cx("overflow-hidden rounded-xl border transition-colors", viewed ? "border-success/40" : "border-line")}
      data-testid="material-item"
      data-viewed={viewed}
    >
      {yt && playing && (
        <div className="relative aspect-video bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`}
            title={m.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 size-full"
          />
        </div>
      )}
      <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
        {yt && !playing ? (
          <button
            onClick={() => setPlaying(true)}
            className="group relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-black sm:w-40"
            aria-label={`נגן: ${m.title}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- remote thumbnail */}
            <img src={`https://i.ytimg.com/vi/${yt}/mqdefault.jpg`} alt="" className="size-full object-cover opacity-90 group-hover:opacity-100" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-9 place-items-center rounded-full bg-black/60 text-white transition group-hover:scale-110">
                <IconPlay size={16} />
              </span>
            </span>
          </button>
        ) : (
          !playing && (
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              <Icon size={22} />
            </span>
          )
        )}
        <div className="min-w-0 flex-1">
          <div className="ut font-semibold leading-snug">{m.title}</div>
          <div className="num mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span>{MATERIAL_LABEL[m.type]}</span>
            {m.duration_minutes && (
              <span className="flex items-center gap-1">
                · <IconClock size={12} /> {m.duration_minutes} דק׳
              </span>
            )}
            <span className="truncate" dir="ltr">
              · {hostname(m.url)}
            </span>
          </div>
          {m.note && <div className="ut mt-1 text-sm text-ink-2">{m.note}</div>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {yt && (
              <button
                onClick={() => setPlaying(!playing)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-accent-ink transition hover:brightness-110"
                data-testid="play-here"
              >
                {playing ? <IconX size={15} /> : <IconPlay size={14} />}
                {playing ? "סגור נגן" : "נגן כאן"}
              </button>
            )}
            <a
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cx(
                "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition",
                yt ? "border border-line hover:bg-surface-2" : "bg-accent text-accent-ink hover:brightness-110",
              )}
              data-testid="open-material"
            >
              <IconExternal size={15} />
              {yt ? "פתח ב-YouTube" : "פתח"}
            </a>
            <button
              onClick={() => onViewed(!viewed)}
              disabled={busy}
              aria-pressed={viewed}
              className={cx(
                "ms-auto inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition",
                viewed ? "bg-success-soft text-success" : "text-ink-2 hover:bg-surface-2",
              )}
              data-testid="material-viewed"
            >
              <span
                className={cx(
                  "grid size-5 place-items-center rounded-md border-2",
                  viewed ? "border-success bg-success text-success-ink" : "border-line",
                )}
              >
                {viewed && <IconCheck size={12} strokeWidth={3} className="anim-pop" />}
              </span>
              צפיתי
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function DoneToggle({ checked, onClick, disabled, label }: { checked: boolean; onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={checked}
      data-testid="material-done"
      className={cx(
        "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-start transition active:scale-[0.99]",
        checked ? "border-success/40 bg-success-soft text-success" : "border-line bg-surface hover:border-accent/50 hover:bg-surface-2",
      )}
    >
      <span className={cx("grid size-6 shrink-0 place-items-center rounded-md border-2 transition", checked ? "border-success bg-success text-success-ink" : "border-line")}>
        {checked && <IconCheck size={14} strokeWidth={3} className="anim-pop" />}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );
}
