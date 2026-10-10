import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** With Supabase set: login required, data synced across devices. Without: on-device only. */
export const isSupabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

/**
 * Browser-only client (the site is a static export, no server).
 * The session lives in localStorage; PKCE handles the Google redirect —
 * the code in the return URL is exchanged automatically on load.
 */
export function getSupabase(): SupabaseClient {
  if (!url || !key) throw new Error("Supabase env vars are not set");
  client ??= createClient(url, key, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "lemidali:auth",
    },
  });
  return client;
}
