"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { LoginScreen } from "@/components/login";
import { Skeleton } from "@/components/ui";
import { getSupabase, isSupabaseConfigured } from "./supabase/client";

interface Auth {
  /** false = on-device mode (no Supabase): no login, no account. */
  enabled: boolean;
  user: User | null;
  signOut: () => Promise<void>;
}

const Ctx = createContext<Auth>({ enabled: false, user: null, signOut: async () => {} });

export const useAuth = () => useContext(Ctx);

/** Where Google sends the user back to (the app root, incl. the GitHub Pages sub-path). */
export const authRedirectUrl = () => `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`;

/**
 * With Supabase: shows the login screen until there is a session, then renders
 * the app. Children are keyed by user id so switching account reloads all data.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) return <Ctx.Provider value={{ enabled: false, user: null, signOut: async () => {} }}>{children}</Ctx.Provider>;
  return <SupabaseGate>{children}</SupabaseGate>;
}

function SupabaseGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sb = getSupabase();
    let alive = true;
    // getSession() also finishes a Google redirect (?code=…) before resolving.
    void sb.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = sb.auth.onAuthStateChange((_event, session) => {
      setUser((prev) => (prev?.id === session?.user.id ? prev : (session?.user ?? null)));
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await getSupabase().auth.signOut();
    setUser(null);
  };

  if (!ready)
    return (
      <div className="mx-auto max-w-md px-4 pt-24">
        <Skeleton />
      </div>
    );
  if (!user) return <LoginScreen />;

  return (
    <Ctx.Provider value={{ enabled: true, user, signOut }}>
      <div key={user.id} className="contents">
        {children}
      </div>
    </Ctx.Provider>
  );
}
