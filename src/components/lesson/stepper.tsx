"use client";

import { STEPS, type StepKey } from "@/lib/progress";
import { IconCheck } from "../icons";
import { cx } from "../ui";

export function Stepper({ done }: { done: Record<StepKey, boolean> }) {
  const current = STEPS.find((s) => !done[s.key])?.key;
  return (
    <ol className="grid grid-cols-4 gap-1" data-testid="stepper">
      {STEPS.map((s, i) => {
        const isDone = done[s.key];
        const isCurrent = s.key === current;
        return (
          <li key={s.key} className="relative">
            {i > 0 && (
              <span
                className={cx(
                  // from this step's center back to the previous step (works in RTL and LTR)
                  "absolute end-1/2 top-4 h-0.5 w-full -translate-y-1/2 transition-colors duration-500",
                  done[STEPS[i - 1].key] ? "bg-success" : "bg-line",
                )}
                aria-hidden
              />
            )}
            <a
              href={`#${s.key}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(s.key)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="relative flex flex-col items-center gap-2 text-center"
              data-step={s.key}
              data-done={isDone}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span
                className={cx(
                  "num grid size-8 place-items-center rounded-full border-2 text-sm font-semibold transition-all duration-500",
                  isDone
                    ? "border-success bg-success text-success-ink"
                    : isCurrent
                      ? "border-accent bg-surface text-accent ring-4 ring-accent/15"
                      : "border-line bg-surface text-muted",
                )}
              >
                {isDone ? <IconCheck size={16} strokeWidth={2.6} className="anim-pop" /> : i + 1}
              </span>
              <span
                className={cx(
                  "text-xs font-medium sm:text-sm",
                  isDone ? "text-success" : isCurrent ? "text-ink" : "text-muted",
                )}
              >
                {s.label}
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
