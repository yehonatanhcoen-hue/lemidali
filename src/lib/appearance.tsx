"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { APPEARANCE_KEY as KEY, LEGACY_THEME_KEY as LEGACY_KEY } from "./appearance-script";

export type ThemeId = "energy" | "clear" | "paper" | "night" | "minimal";
export type Mode = "auto" | "light" | "dark";
export type TextSize = "sm" | "md" | "lg" | "xl";
export type Appearance = { theme: ThemeId; mode: Mode; size: TextSize };

export const DEFAULT_APPEARANCE: Appearance = { theme: "energy", mode: "auto", size: "md" };

export const THEMES: { id: ThemeId; name: string; blurb: string; font: string }[] = [
  { id: "energy", name: "אנרגיה", blurb: "אלמוג וחמימות, פינות עגולות וכפתורים לחיצים. מעודד להמשיך.", font: "Varela Round + Rubik" },
  { id: "clear", name: "צלול", blurb: "אינדיגו נקי ומרווח. ניטרלי ומקצועי.", font: "Rubik" },
  { id: "paper", name: "נייר ודיו", blurb: "נייר חמים וכותרות סריף. נוח לקריאה ארוכה.", font: "Frank Ruhl Libre + Assistant" },
  { id: "night", name: "לילה ממוקד", blurb: "כחול עמוק וטורקיז. מתאים במיוחד למצב כהה ולערב.", font: "Heebo" },
  { id: "minimal", name: "מינימל", blurb: "שחור-לבן, פינות חדות, בלי קישוטים.", font: "Assistant" },
];

export const MODES: { id: Mode; label: string }[] = [
  { id: "auto", label: "לפי המכשיר" },
  { id: "light", label: "בהיר" },
  { id: "dark", label: "כהה" },
];

export const SIZES: { id: TextSize; label: string }[] = [
  { id: "sm", label: "קטן" },
  { id: "md", label: "רגיל" },
  { id: "lg", label: "גדול" },
  { id: "xl", label: "גדול מאוד" },
];

/** Page background per theme/mode — used for the browser / home-screen status bar color. */
const BG: Record<ThemeId, [string, string]> = {
  energy: ["#fff7ee", "#1c1410"],
  clear: ["#f5f6f8", "#0b0d12"],
  paper: ["#f6f1e7", "#1b1915"],
  night: ["#f2f5f9", "#0f1522"],
  minimal: ["#ffffff", "#0a0a0a"],
};


function read(): Appearance {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<Appearance>;
    const legacy = localStorage.getItem(LEGACY_KEY);
    return {
      theme: THEMES.some((t) => t.id === raw.theme) ? (raw.theme as ThemeId) : DEFAULT_APPEARANCE.theme,
      mode: raw.mode ?? (legacy === "dark" || legacy === "light" ? legacy : "auto"),
      size: SIZES.some((s) => s.id === raw.size) ? (raw.size as TextSize) : "md",
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

const systemDark = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches;

function apply(a: Appearance) {
  const d = document.documentElement;
  const dark = a.mode === "dark" || (a.mode === "auto" && systemDark());
  d.setAttribute("data-theme", a.theme);
  d.setAttribute("data-size", a.size);
  d.classList.toggle("dark", dark);
  const color = BG[a.theme][dark ? 1 : 0];
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute("content", color);
    m.removeAttribute("media");
  });
}

type Ctx = Appearance & {
  ready: boolean;
  dark: boolean;
  set: (patch: Partial<Appearance>) => void;
};

const AppearanceContext = createContext<Ctx | null>(null);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [ready, setReady] = useState(false);
  const [sysDark, setSysDark] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with what the head script already applied
    setState(read());
    setSysDark(systemDark());
    setReady(true);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSysDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (ready) apply(state);
  }, [state, sysDark, ready]);

  const set = useCallback((patch: Partial<Appearance>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
        localStorage.removeItem(LEGACY_KEY);
      } catch {}
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({ ...state, ready, dark: state.mode === "dark" || (state.mode === "auto" && sysDark), set }),
    [state, ready, sysDark, set],
  );
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used inside <AppearanceProvider>");
  return ctx;
}
