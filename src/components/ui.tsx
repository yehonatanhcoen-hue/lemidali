"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { STATUS_LABEL } from "@/lib/progress";
import type { LessonStatus } from "@/lib/types";
import { IconCheck } from "./icons";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("rounded-2xl border border-line bg-surface shadow-card", className)} {...rest}>
      {children}
    </div>
  );
}

/** Animated bar — grows from 0 on mount and transitions on every change. */
export function ProgressBar({
  percent,
  size = "md",
  tone = "accent",
  label,
}: {
  percent: number;
  size?: "sm" | "md" | "lg";
  tone?: "accent" | "success";
  label?: string;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(percent));
    return () => cancelAnimationFrame(id);
  }, [percent]);
  const h = size === "lg" ? "h-3" : size === "sm" ? "h-1.5" : "h-2";
  const full = percent >= 100;
  return (
    <div
      className={cx("w-full overflow-hidden rounded-full bg-track", h)}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cx(
          "h-full rounded-full transition-[width,background-color] duration-700 ease-[cubic-bezier(.2,.7,.2,1)]",
          full || tone === "success" ? "bg-success" : "bg-accent",
        )}
        style={{ width: `${shown}%` }}
      />
    </div>
  );
}

const STATUS_STYLE: Record<LessonStatus, string> = {
  not_started: "bg-surface-2 text-muted",
  in_progress: "bg-warn-soft text-warn",
  completed: "bg-success-soft text-success",
};

export function StatusBadge({ status }: { status: LessonStatus }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        STATUS_STYLE[status],
      )}
      data-status={status}
    >
      <span
        className={cx(
          "size-1.5 rounded-full",
          status === "completed" ? "bg-success" : status === "in_progress" ? "bg-warn" : "bg-muted",
        )}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Round marker used in lesson lists: number / ring / check. */
export function StatusDot({ status, number }: { status: LessonStatus; number: number }) {
  if (status === "completed")
    return (
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success text-white anim-pop">
        <IconCheck size={18} strokeWidth={2.4} />
      </span>
    );
  return (
    <span
      className={cx(
        "num grid size-9 shrink-0 place-items-center rounded-full border-2 text-sm font-semibold",
        status === "in_progress" ? "border-warn bg-warn-soft text-warn" : "border-line text-muted",
      )}
    >
      {number}
    </span>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-110",
  success: "bg-success text-white hover:brightness-110",
  secondary: "border border-line bg-surface text-ink hover:bg-surface-2",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "text-danger hover:bg-danger-soft",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-sm" : size === "lg" ? "h-12 px-6 text-base" : "h-10 px-4 text-sm",
        BTN[variant],
        className,
      )}
      {...rest}
    />
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: BtnVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition active:scale-[0.98]",
        BTN[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8 anim-rise">
      {eyebrow && <div className="mb-2 text-sm font-medium text-muted">{eyebrow}</div>}
      <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
      {children && <div className="mt-3 text-ink-2">{children}</div>}
    </header>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Card className="p-10 text-center">
      <div className="text-lg font-semibold">{title}</div>
      {children && <div className="mt-2 text-sm text-ink-2">{children}</div>}
    </Card>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/15";

export function Skeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy>
      <div className="h-9 w-64 rounded-lg bg-surface-2" />
      <div className="h-32 rounded-2xl bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-36 rounded-2xl bg-surface-2" />
        <div className="h-36 rounded-2xl bg-surface-2" />
      </div>
    </div>
  );
}
