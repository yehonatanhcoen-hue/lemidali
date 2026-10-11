"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { useAppearance } from "@/lib/appearance";
import { useAuth } from "@/lib/auth";
import { useCourse } from "@/lib/store";
import type { CourseData } from "@/lib/types";
import { importDemo } from "@/lib/importer";
import { IconBook, IconChart, IconHome, IconMoon, IconPalette, IconSliders, IconSun, IconTarget, IconUpload } from "./icons";
import { Button, ButtonLink, Card, Skeleton, cx } from "./ui";

const NAV = [
  { href: "/", label: "בית", icon: IconHome, match: (p: string) => p === "/" },
  { href: "/course", label: "קורס", icon: IconBook, match: (p: string) => /^\/(course|topic|lesson|exam)/.test(p) },
  { href: "/progress", label: "התקדמות", icon: IconChart, match: (p: string) => p.startsWith("/progress") },
  { href: "/practice", label: "תרגול", icon: IconTarget, match: (p: string) => p.startsWith("/practice") },
  { href: "/manage", label: "ניהול", icon: IconSliders, match: (p: string) => p.startsWith("/manage") },
];

/** Quick light/dark switch. Theme, auto mode and text size live on the Appearance page. */
function ModeToggle({ compact }: { compact?: boolean }) {
  const { dark, set } = useAppearance();
  const label = dark ? "מצב בהיר" : "מצב כהה";
  return (
    <button
      onClick={() => set({ mode: dark ? "light" : "dark" })}
      aria-label={label}
      title={label}
      className={cx(
        "flex items-center gap-3 rounded-xl text-sm text-ink-2 transition hover:bg-surface-2 hover:text-ink",
        compact ? "size-10 justify-center" : "h-10 w-full px-3 md:justify-center lg:justify-start",
      )}
    >
      {dark ? <IconSun /> : <IconMoon />}
      {!compact && <span className="hidden lg:inline">{label}</span>}
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { mode, data } = useCourse();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-dvh md:flex">
      {/* Sidebar — iPad: icon rail, desktop: full */}
      <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col border-e border-line bg-surface px-3 py-6 md:flex md:w-20 lg:w-64">
        <Link href="/" className="mb-8 flex items-center gap-3 px-2">
          <span className="grid size-10 place-items-center rounded-xl bg-accent text-lg font-bold text-accent-ink">ל</span>
          <span className="hidden min-w-0 lg:block">
            <span className="block text-base font-bold leading-tight">לומדה</span>
            <span className="ut block truncate text-xs text-muted">{data?.course.title ?? " "}</span>
          </span>
        </Link>
        <Suspense fallback={<SideNav pathname="" />}>
          <SideNavActive />
        </Suspense>
        <div className="mt-auto space-y-2">
          {mode === "local" && (
            <div
              className="hidden rounded-xl bg-surface-2 px-3 py-2 text-xs leading-relaxed text-muted lg:block"
              title="Supabase לא מוגדר — הנתונים נשמרים בדפדפן"
            >
              מצב מקומי · הנתונים נשמרים בדפדפן הזה
            </div>
          )}
          {user && (
            <div className="hidden rounded-xl bg-surface-2 px-3 py-2 text-xs text-muted lg:block" data-testid="sidebar-account">
              <bdi className="block truncate" dir="ltr">
                {user.email}
              </bdi>
              <button onClick={() => void signOut()} className="mt-1 font-medium text-accent hover:underline">
                התנתק
              </button>
            </div>
          )}
          <div className="flex flex-col items-center gap-1 lg:items-stretch">
            <AppearanceLink />
            <ModeToggle />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface/85 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-ink">ל</span>
          <span className="font-bold">לומדה</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/appearance" aria-label="מראה וערכות נושא" title="מראה" className="grid size-10 place-items-center rounded-xl text-ink-2 transition hover:bg-surface-2 hover:text-ink">
            <IconPalette />
          </Link>
          <ModeToggle compact />
        </div>
      </div>

      {/* overflow-x-clip: one long word can never push the whole page sideways on a phone */}
      <main className="min-w-0 flex-1 overflow-x-clip px-4 pt-5 pb-28 sm:px-6 md:px-8 md:pt-10 md:pb-16 lg:px-12">
        <div className="mx-auto max-w-5xl 2xl:max-w-6xl">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <Suspense fallback={<BottomNav pathname="" />}>
        <BottomNavActive />
      </Suspense>
    </div>
  );
}

function AppearanceLink() {
  return (
    <Link
      href="/appearance"
      title="מראה"
      className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-ink-2 transition hover:bg-surface-2 hover:text-ink md:justify-center lg:justify-start"
    >
      <IconPalette />
      <span className="hidden lg:inline">מראה וערכות נושא</span>
    </Link>
  );
}

// usePathname is request data → isolated behind Suspense so the shell can prerender.
function SideNavActive() {
  return <SideNav pathname={usePathname()} />;
}
function BottomNavActive() {
  return <BottomNav pathname={usePathname()} />;
}

function SideNav({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={cx(
              "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition md:justify-center lg:justify-start",
              active ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
            )}
          >
            <Icon size={21} />
            <span className="hidden lg:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cx(
                "flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition",
                active ? "text-accent" : "text-muted",
              )}
            >
              <span className={cx("grid h-7 w-12 place-items-center rounded-full transition", active && "bg-accent-soft")}>
                <Icon size={21} />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
  );
}

/** Renders children only once course data is loaded; handles loading/error/empty. */
export function WithData({ children }: { children: (data: CourseData) => React.ReactNode }) {
  const { data, loading, error, refresh } = useCourse();
  if (loading) return <Skeleton />;
  if (error)
    return (
      <Card className="border-danger/30 p-8">
        <div className="font-semibold text-danger">לא הצלחנו לטעון את הנתונים</div>
        <div className="num mt-2 text-sm text-ink-2" dir="ltr">
          {error}
        </div>
        <button onClick={() => void refresh()} className="mt-4 text-sm font-medium text-accent">
          נסה שוב
        </button>
      </Card>
    );
  if (!data) return <NoCourse />;
  return <>{children(data)}</>;
}

function NoCourse() {
  const { run } = useCourse();
  const [busy, setBusy] = useState(false);
  return (
    <Card className="p-8 text-center sm:p-12" data-testid="no-course">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <IconBook size={26} />
      </span>
      <h1 className="mt-5 text-2xl font-bold">עדיין אין קורס</h1>
      <p className="mx-auto mt-2 max-w-md text-ink-2">
        ייבא קובץ קורס (JSON) מעמוד הניהול, או טען קורס דמו כדי לראות איך הכל עובד.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <ButtonLink href="/manage#import">
          <IconUpload size={17} /> ייבוא קורס
        </ButtonLink>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await run((repo) => importDemo(repo));
            setBusy(false);
          }}
          data-testid="load-demo"
        >
          טען קורס דמו
        </Button>
      </div>
    </Card>
  );
}
