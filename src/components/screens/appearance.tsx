"use client";

import { MODES, SIZES, THEMES, useAppearance, type ThemeId } from "@/lib/appearance";
import { IconCheck, IconMoon, IconPalette, IconSun, IconTextSize } from "../icons";
import { Card, PageHeader, cx } from "../ui";

export function AppearanceScreen() {
  const { theme, mode, size, set } = useAppearance();

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="הגדרות" title="מראה">
        בחר ערכת נושא, מצב תאורה וגודל טקסט. הבחירה נשמרת במכשיר הזה.
      </PageHeader>

      <section aria-labelledby="themes-h">
        <SectionTitle id="themes-h" icon={<IconPalette size={20} />}>
          ערכת נושא
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="ערכת נושא">
          {THEMES.map((t) => (
            <ThemeCard key={t.id} id={t.id} name={t.name} blurb={t.blurb} font={t.font} selected={theme === t.id} onSelect={() => set({ theme: t.id })} />
          ))}
        </div>
      </section>

      <section aria-labelledby="mode-h">
        <SectionTitle id="mode-h" icon={<IconMoon size={20} />}>
          מצב תאורה
        </SectionTitle>
        <Segmented
          label="מצב תאורה"
          value={mode}
          options={MODES.map((m) => ({
            id: m.id,
            label: m.label,
            icon: m.id === "light" ? <IconSun size={18} /> : m.id === "dark" ? <IconMoon size={18} /> : null,
          }))}
          onChange={(v) => set({ mode: v })}
        />
        <p className="mt-2 text-sm text-muted">״לפי המכשיר״ עובר לבד בין בהיר לכהה לפי ההגדרה של הטלפון או המחשב.</p>
      </section>

      <section aria-labelledby="size-h">
        <SectionTitle id="size-h" icon={<IconTextSize size={20} />}>
          גודל טקסט
        </SectionTitle>
        <Segmented label="גודל טקסט" value={size} options={SIZES.map((s) => ({ id: s.id, label: s.label }))} onChange={(v) => set({ size: v })} />
        <Card className="mt-4 p-5">
          <p className="leading-relaxed text-ink-2">
            כך ייראה הטקסט בשיעורים ובמבחנים. כל האפליקציה גדלה או קטנה יחד, כולל כפתורים ומרווחים.
          </p>
        </Card>
      </section>
    </div>
  );
}

function SectionTitle({ id, icon, children }: { id: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mb-4 flex items-center gap-2 text-xl font-bold">
      <span className="text-accent">{icon}</span>
      {children}
    </h2>
  );
}

/** A real mini dashboard rendered with the theme's own tokens (data-theme scopes them). */
function ThemeCard({
  id,
  name,
  blurb,
  font,
  selected,
  onSelect,
}: {
  id: ThemeId;
  name: string;
  blurb: string;
  font: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      data-testid={`theme-${id}`}
      className={cx(
        "group rounded-2xl text-start outline-offset-4 transition",
        selected ? "ring-2 ring-accent ring-offset-2 ring-offset-bg" : "hover:-translate-y-0.5",
      )}
    >
      <div data-theme={id} className="overflow-hidden rounded-2xl border-[length:var(--card-border)] border-line bg-bg font-sans text-ink">
        <div className="p-4">
          <div className="text-xs text-muted">הקורס שלי</div>
          <h3 className="font-display mt-0.5 text-lg font-bold">יסודות הבינה המלאכותית</h3>
          <div className="mt-3 rounded-2xl border-[length:var(--card-border)] border-line bg-surface p-3 shadow-card">
            <div className="num flex justify-between text-xs">
              <span className="text-ink-2">התקדמות</span>
              <span className="font-semibold">42%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-track">
              <div className="h-full w-[42%] rounded-full bg-accent" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <span className="inline-flex h-9 flex-1 items-center justify-center rounded-xl bg-accent text-xs font-medium text-accent-ink shadow-[var(--press)]">
              המשך לשיעור 12
            </span>
            <span className="grid size-9 place-items-center rounded-full bg-success text-success-ink">
              <IconCheck size={16} strokeWidth={2.4} />
            </span>
          </div>
        </div>
        <div className="flex items-start justify-between gap-3 border-t border-line bg-surface px-4 py-3">
          <div className="min-w-0">
            <div className="font-semibold">{name}</div>
            <div className="mt-0.5 text-xs leading-relaxed text-ink-2">{blurb}</div>
            <div className="mt-1 text-[11px] text-muted" dir="ltr">
              {font}
            </div>
          </div>
          <span
            className={cx(
              "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 transition",
              selected ? "border-accent bg-accent text-accent-ink" : "border-line",
            )}
            aria-hidden
          >
            {selected && <IconCheck size={14} strokeWidth={2.6} />}
          </span>
        </div>
      </div>
    </button>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string; icon?: React.ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={cx(
              "inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium transition sm:h-10",
              on ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:text-ink",
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
