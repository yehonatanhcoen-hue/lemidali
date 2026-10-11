"use client";

import { useEffect, useState } from "react";
import { authRedirectUrl } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase/client";
import { Logo } from "./logo";
import { Button, Card, Field, inputCls } from "./ui";

type Mode = "signin" | "signup";

/** Supabase auth messages → Hebrew. */
function hebrew(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "האימייל או הסיסמה שגויים.";
  if (m.includes("email not confirmed")) return "צריך לאשר את כתובת המייל קודם. חפש את מייל האימות בתיבת הדואר (גם בספאם).";
  if (m.includes("database error saving new user") || m.includes("limited to the app owner"))
    return "ההרשמה פתוחה רק לבעל האפליקציה. השתמש בכתובת המייל שלך.";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider"))
    return "התחברות עם Google עוד לא הופעלה בהגדרות Supabase. בינתיים אפשר להתחבר עם אימייל וסיסמה.";
  if (m.includes("already registered")) return "כבר יש חשבון עם המייל הזה. עבור ל\"התחברות\".";
  if (m.includes("password should be at least") || m.includes("weak password")) return "הסיסמה קצרה מדי (לפחות 6 תווים).";
  if (m.includes("rate limit") || m.includes("too many")) return "יותר מדי ניסיונות. נסה שוב בעוד כמה דקות.";
  if (m.includes("failed to fetch") || m.includes("network")) return "אין חיבור לשרת. בדוק את החיבור לאינטרנט ונסה שוב.";
  return message;
}

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  // Errors that come back from the Google redirect (?error_description=…)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search + window.location.hash.replace(/^#/, "&"));
    const desc = params.get("error_description");
    if (desc) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the redirect result
      setError(hebrew(desc.replace(/\+/g, " ")));
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const google = async () => {
    setBusy("google");
    setError(null);
    try {
      // If Google isn't switched on in Supabase, the redirect would land on a raw error page — check first.
      const sb = getSupabase();
      const settings = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "" },
      }).then((r) => r.json() as Promise<{ external?: { google?: boolean } }>);
      if (!settings.external?.google) throw new Error("provider is not enabled");
      const { data, error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: authRedirectUrl(), skipBrowserRedirect: true },
      });
      if (error) throw error;
      window.location.assign(data.url);
    } catch (e) {
      setError(hebrew(e instanceof Error ? e.message : String(e)));
      setBusy(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("email");
    setError(null);
    setSent(null);
    const auth = getSupabase().auth;
    const address = email.trim().toLowerCase();
    if (mode === "signin") {
      const { error } = await auth.signInWithPassword({ email: address, password });
      if (error) setError(hebrew(error.message));
    } else {
      const { data, error } = await auth.signUp({
        email: address,
        password,
        options: { emailRedirectTo: authRedirectUrl() },
      });
      if (error) setError(hebrew(error.message));
      else if (!data.session) {
        setSent(address);
        setMode("signin");
      }
    }
    setBusy(null);
  };

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm anim-rise">
        <div className="mb-8 text-center">
          <Logo size="lg" />
          <h1 className="sr-only">לומדה</h1>
          <p className="mt-2 text-ink-2">התחבר כדי שהקורסים וההתקדמות שלך יהיו זמינים בכל מכשיר.</p>
        </div>

        <Card className="p-6" data-testid="login">
          <Button variant="secondary" size="lg" className="w-full" onClick={google} disabled={busy !== null} data-testid="login-google">
            {busy === "google" ? "מעביר ל-Google…" : "המשך עם Google"}
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            או עם אימייל
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Field label="אימייל">
              <input
                id="login-email"
                type="email"
                dir="ltr"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="סיסמה" hint={mode === "signup" ? "לפחות 6 תווים" : undefined}>
              <input
                id="login-password"
                type="password"
                dir="ltr"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
              />
            </Field>

            {error && (
              <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" data-testid="login-error">
                {error}
              </p>
            )}
            {sent && (
              <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-ink" data-testid="login-sent">
                שלחנו מייל אימות ל-<bdi>{sent}</bdi>. לחץ על הקישור שבמייל, ואז התחבר כאן.
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={busy !== null} data-testid="login-submit">
              {busy === "email" ? "רגע…" : mode === "signin" ? "התחברות" : "יצירת חשבון"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-ink-2">
            {mode === "signin" ? "פעם ראשונה כאן? " : "כבר יש לך חשבון? "}
            <button
              type="button"
              className="font-medium text-accent hover:underline"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              data-testid="login-toggle"
            >
              {mode === "signin" ? "יצירת חשבון" : "התחברות"}
            </button>
          </p>
        </Card>
      </div>
    </div>
  );
}
