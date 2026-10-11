"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase/client";
import { hebrew } from "../login";
import { Button, Card, Field, inputCls } from "../ui";

/** Signed-in account: email, change password, sign out. Hidden in on-device mode. */
export function AccountCard() {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  if (!user) return null;

  return (
    <Card className="mt-6 p-5" data-testid="account-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-ink-2">מחובר כ-</div>
          <bdi className="block truncate font-semibold" dir="ltr">
            {user.email}
          </bdi>
          <div className="mt-1 text-sm text-muted">הקורסים וההתקדמות נשמרים בחשבון וזמינים בכל מכשיר שמתחבר אליו.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="change-password">
            החלפת סיסמה
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await signOut();
            }}
            data-testid="sign-out"
          >
            התנתק
          </Button>
        </div>
      </div>
      {open && <PasswordForm onDone={() => setOpen(false)} />}
    </Card>
  );
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("שתי הסיסמאות לא זהות.");
    setBusy(true);
    const { error } = await getSupabase().auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(hebrew(error.message));
    setSaved(true);
    setPassword("");
    setConfirm("");
  };

  if (saved)
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-accent-soft px-4 py-3 text-sm" data-testid="password-saved">
        <span>הסיסמה הוחלפה. בפעם הבאה התחבר עם הסיסמה החדשה.</span>
        <Button size="sm" variant="secondary" onClick={onDone}>
          סגור
        </Button>
      </div>
    );

  return (
    <form onSubmit={submit} className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2" data-testid="password-form">
      <Field label="סיסמה חדשה" hint="לפחות 6 תווים">
        <input
          id="new-password"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field label="שוב, לאימות">
        <input
          id="confirm-password"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputCls}
        />
      </Field>
      {error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger sm:col-span-2" data-testid="password-error">
          {error}
        </p>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={busy} data-testid="password-submit">
          {busy ? "שומר…" : "שמור סיסמה"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          ביטול
        </Button>
      </div>
    </form>
  );
}
