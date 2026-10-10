"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth";
import { repo, type Repository } from "./repo";
import { migrateLocalData } from "./repo/migrate";
import type { CourseData } from "./types";

interface Store {
  data: CourseData | null;
  loading: boolean;
  error: string | null;
  mode: Repository["mode"];
  repo: Repository;
  refresh: () => Promise<void>;
  /** Runs a change against storage, then reloads so all progress is recomputed. */
  run: (fn: (repo: Repository) => Promise<unknown>) => Promise<void>;
  /** Notes save without a full reload (keeps typing smooth). */
  saveNote: (lessonId: string, content: string) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const userId = user?.id;

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
    // First login on this device: copy on-device data to the account, then load.
    const first = userId ? migrateLocalData(userId).catch((e) => console.error("Moving on-device data failed", e)) : null;
    void Promise.resolve(first).then(refresh);
  }, [refresh, userId]);

  const run = useCallback(
    async (fn: (r: Repository) => Promise<unknown>) => {
      try {
        await fn(repo);
      } finally {
        await refresh();
      }
    },
    [refresh],
  );

  const saveNote = useCallback(async (lessonId: string, content: string) => {
    const updated_at = await repo.saveNote(lessonId, content);
    setData((d) => (d ? { ...d, notes: { ...d.notes, [lessonId]: { lesson_id: lessonId, content, updated_at } } } : d));
  }, []);

  const value = useMemo(
    () => ({ data, loading, error, mode: repo.mode, repo, refresh, run, saveNote }),
    [data, loading, error, refresh, run, saveNote],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCourse() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCourse must be used inside CourseProvider");
  return ctx;
}
