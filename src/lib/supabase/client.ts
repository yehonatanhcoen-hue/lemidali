import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

/**
 * Browser client (cookie-based session via @supabase/ssr), so adding
 * Google Login later only needs: signInWithOAuth({ provider: "google" }),
 * an /auth/callback route and a proxy.ts that refreshes the session.
 */
export function getSupabase(): SupabaseClient {
  if (!url || !key) throw new Error("Supabase env vars are not set");
  client ??= createBrowserClient(url, key);
  return client;
}
