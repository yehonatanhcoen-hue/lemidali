# לומדה — Lemidali

אפליקציית Web אישית לניהול תהליך למידה: Course → Topics → Lessons.
שלד MVP עם תוכן Placeholder בלבד, מוכן להזנת הקורס האמיתי.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (`@supabase/ssr` + publishable key)

## הרצה מהירה (בלי Supabase)

```bash
npm install
npm run dev
```

פתח http://localhost:3000. בלי משתני סביבה האפליקציה רצה ב**מצב מקומי** — הנתונים נשמרים ב-localStorage של הדפדפן (מסומן בתחתית ה-Sidebar). טוב לבדיקת הממשק.

## חיבור Supabase

1. צור פרויקט ב-[supabase.com](https://supabase.com).
2. ב-**SQL Editor** הרץ את `supabase/migrations/20261010000000_init.sql`, ואז את `supabase/seed.sql` (נתוני דמו — אופציונלי).
   *(או עם Supabase CLI: `supabase link` ואז `supabase db push`.)*
3. העתק `.env.example` ל-`.env.local` ומלא את ה-URL וה-Publishable key (Project Settings → API Keys).
4. `npm run dev` — ה-Sidebar כבר לא יציג "מצב מקומי".

> **אבטחה:** כרגע אין התחברות, וה-RLS מאפשר גישה מלאה עם ה-publishable key (`mvp_full_access`). מתאים לשימוש אישי, אבל כל מי שיש לו את כתובת האתר יכול לשנות נתונים. לפני פריסה ציבורית — להוסיף Google Login (למטה).

## מבנה

```
src/
  app/                    routes: / · /course · /topics/[id] · /lessons/[id] · /progress · /manage
  components/
    screens/              מסך לכל route
    lesson/               חלקי עמוד השיעור: material · quiz · notes · complete · stepper
    app-shell.tsx         Sidebar (דסקטופ/אייפד) + Bottom nav (מובייל) + Dark mode
  lib/
    types.ts              טיפוסי הדומיין
    progress.ts           חישובי התקדמות, "המשך ללמוד", שלבי שיעור, סטטיסטיקות מבחן
    store.tsx             React context: טעינה + פעולות
    repo/                 שכבת נתונים — Repository interface
      supabase.ts         מימוש Supabase
      local.ts            מימוש localStorage (fallback)
supabase/
  migrations/             סכמה + RLS + grants
  seed.sql                תוכן Placeholder
```

## מודל נתונים — שינויים מההצעה המקורית

| שינוי | למה |
|---|---|
| `status` עבר מ-`lessons` לטבלה `lesson_progress` (יחד עם `material_completed`, `last_opened_at`, `completed_at`) | הפרדה בין **תוכן** ל**מצב הלומד**. כשתתווסף התחברות, רק טבלאות המצב צריכות `user_id` |
| אין טבלת `lesson_quizzes` — `quiz_questions.lesson_id` | מבחן אחד לשיעור; טבלת ביניים לא מוסיפה ערך |
| `order` → `position` | `order` מילה שמורה ב-SQL |
| `quiz_attempts.total` | לחישוב אחוז גם אם מספר השאלות ישתנה |
| `quiz_answers.position` + אינדקס ייחודי לתשובה נכונה אחת | סדר יציב ושלמות נתונים |
| `lesson_attachments`: `mime_type`, `size_bytes` | מוכן להעלאת קבצים |

ציון אחרון / גבוה / מספר ניסיונות מחושבים מ-`quiz_attempts`.

## TODO לשלבים הבאים

- **העלאת קבצים:** ה-UI ומבנה הנתונים קיימים. לחבר: bucket בשם `lesson-files` ב-Supabase Storage, ולממש `uploadAttachment` ב-`src/lib/repo/supabase.ts` (יש שם הערה עם הקוד), ולהפעיל את ה-input ב-`src/components/lesson/notes.tsx`.
- **Google Login:** להפעיל Google provider ב-Supabase Auth; `signInWithOAuth({ provider: "google" })`; route `app/auth/callback`; `proxy.ts` לרענון session; להוסיף `user_id` לטבלאות המצב ולהחליף את מדיניות `mvp_full_access` ב-`using (user_id = auth.uid())`.

## בדיקות שבוצעו

Flow מלא נבדק אוטומטית בדפדפן (Playwright), גם במצב מקומי וגם מול Postgres + PostgREST (השכבה ש-Supabase משתמשת בה):
Home → Topic → Lesson → Learning Material → Quiz (נכון/שגוי, ציון, ניסיון חוזר) → Notes (שמירה אוטומטית) → Complete → Progress update → Refresh (הכל נשמר) → Manage (הוספה, עריכה, מחיקה, סידור, שאלות) → Dark mode → מובייל / אייפד לאורך / אייפד לרוחב.
