import { cx } from "./ui";

/**
 * The "button" logo: the word לומדה on a pushable pill with a yellow dot.
 * Uses the theme's accent so it fits every theme; font is always Varela Round.
 * `compact` renders just "ל" on a square-ish button (narrow iPad rail, tiny places).
 */
export function Logo({ size = "md", compact, className }: { size?: "sm" | "md" | "lg"; compact?: boolean; className?: string }) {
  const s = {
    sm: compact ? "size-9 text-lg" : "h-8 px-3.5 text-[0.95rem]",
    md: compact ? "size-10 text-xl" : "h-9 px-4 text-[1.05rem]",
    lg: compact ? "size-14 text-3xl" : "h-14 px-7 text-[1.75rem]",
  }[size];
  const dot = { sm: "size-2.5", md: "size-3", lg: "size-4" }[size];
  return (
    <span
      className={cx(
        "relative inline-flex shrink-0 items-center justify-center bg-accent leading-none text-accent-ink",
        "font-[family-name:var(--f-varela)] font-normal",
        "shadow-[0_3px_0_color-mix(in_srgb,var(--accent)_72%,black)]",
        compact ? "rounded-[30%]" : "rounded-full",
        s,
        className,
      )}
      aria-label="לומדה"
      role="img"
    >
      <span aria-hidden>
        {compact ? "ל" : "לומדה"}
      </span>
      <span aria-hidden className={cx("absolute -top-1 rounded-full bg-[#ffc53d]", dot, compact ? "start-1" : "start-2.5")} />
    </span>
  );
}
