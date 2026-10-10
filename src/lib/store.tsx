"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { repo, type Repository } from "./repo";
import type { CourseData } from "./types";

type Actions = Omit<Repository, "mode" | "load" | "saveNote">;

interface Store {
  data: CourseData | null;
  loading: boolean;
  error: string | null;
  mode: Repository["mode"];
  refresh: () => Promise<void>;
  /** Mutations: run against storage, then reload so all progress is recomputed. */
  actions: Actions;
  /** Notes save without a full reload (keeps typing smooth). */
  saveNote: (lessonId: string, content: string) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setData(await repo.load());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial client-side load
    void refresh();
  }, [refresh]);

  const actions = useMemo(() => {
    const wrap =
      <A extends unknown[]>(fn: (...args: A) => Promise<unknown>) =>
      async (...args: A) => {
        try {
          await fn(...args);
        } finally {
          await refresh();
        }
      };
    const a = {} as Record<string, unknown>;
    for (const key of Object.keys(repo) as (keyof Repository)[]) {
      if (key === "mode" || key === "load" || key === "saveNote") continue;
      const fn = repo[key] as (...args: unknown[]) => Promise<unknown>;
      a[key] = wrap(fn.bind(repo));
    }
    return a as unknown as Actions;
  }, [refresh]);

  const saveNote = useCallback(async (lessonId: string, content: string) => {
    const updated_at = await repo.saveNote(lessonId, content);
    setData((d) => (d ? { ...d, notes: { ...d.notes, [lessonId]: { lesson_id: lessonId, content, updated_at } } } : d));
  }, []);

  const value = useMemo(
    () => ({ data, loading, error, mode: repo.mode, refresh, actions, saveNote }),
    [data, loading, error, refresh, actions, saveNote],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCourse() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCourse must be used inside CourseProvider");
  return ctx;
}
