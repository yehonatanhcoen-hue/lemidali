"use client";

import { useState } from "react";
import { IconCheck, IconLock } from "../icons";
import { Card, cx } from "../ui";

/**
 * One step of the lesson. When the previous step isn't done the section
 * shows a gentle notice instead of its content — one click opens it anyway.
 */
export function Section({
  id,
  step,
  title,
  done,
  locked,
  lockedText,
  children,
}: {
  id: string;
  step: number;
  title: string;
  done: boolean;
  locked?: boolean;
  lockedText?: string;
  children: React.ReactNode;
}) {
  const [forced, setForced] = useState(false);
  const showLock = locked && !forced;
  return (
    <Card id={id} className="scroll-mt-24 p-5 sm:p-7" data-testid={`section-${id}`}>
      <div className="mb-5 flex items-center gap-3">
        <span
          className={cx(
            "num grid size-8 place-items-center rounded-full text-sm font-semibold transition-colors duration-500",
            done ? "bg-success text-success-ink" : showLock ? "bg-surface-2 text-muted" : "bg-accent-soft text-accent",
          )}
        >
          {done ? <IconCheck size={16} strokeWidth={2.6} className="anim-pop" /> : step}
        </span>
        <h2 className={cx("text-xl font-bold", showLock && "text-muted")}>{title}</h2>
      </div>
      {showLock ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-line bg-surface-2/60 px-4 py-4">
          <div className="flex items-center gap-2.5 text-sm text-ink-2">
            <IconLock size={18} className="shrink-0 text-muted" />
            {lockedText}
          </div>
          <button onClick={() => setForced(true)} className="text-sm font-medium text-accent hover:underline">
            פתח בכל זאת
          </button>
        </div>
      ) : (
        <div className="anim-rise">{children}</div>
      )}
    </Card>
  );
}
