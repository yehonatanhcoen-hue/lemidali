# לומדה — Lemidali

אפליקציית Web אישית ללמידת קורס: Course → Topics → Lessons, עם חומרי לימוד, מבחנים, נעילה לפי ציון, תרגול טעויות ומבחני סיכום לנושא.
הקורס נטען מקובץ JSON אחד, שאפשר לבנות בעזרת כל צ׳אט AI.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (`@supabase/ssr` + publishable key)

## הרצה מהירה (בלי Supabase)

```bash
npm install
npm run dev
```

פתח http://localhost:3000 ובחר "טען קורס דמו", או ייבא קובץ קורס מעמוד **ניהול**.
בלי משתני סביבה האפליקציה רצה ב**מצב מקומי**: הנתונים נשמרים ב-localStorage של הדפדפן (מסומן בתחתית ה-Sidebar).

## חיבור Supabase

1. צור פרויקט ב-[supabase.com](https://supabase.com).
2. ב-**SQL Editor** הרץ את `supabase/migrations/20261010000000_init.sql`.
   *(או עם Supabase CLI: `supabase link` ואז `supabase db push`.)*
   אם הרצת גרסה קודמת של הקובץ, מחק קודם את הטבלאות הישנות (או צור פרויקט חדש). הסכמה השתנתה.
3. העתק `.env.example` ל-`.env.local` ומלא את ה-URL וה-Publishable key (Project Settings → API Keys).
4. `npm run dev`. ה-Sidebar כבר לא יציג "מצב מקומי".

> **אבטחה:** אין התחברות, וה-RLS מאפשר גישה מלאה עם ה-publishable key (`mvp_full_access`). זה מתאים לשימוש אישי, אבל כל מי שיש לו את כתובת האתר יכול לשנות נתונים. לפני פריסה ציבורית צריך להוסיף Google Login (ראו TODO).

## הזנת קורס

| קובץ | מה זה |
|---|---|
| `public/course-format.md` | **ההוראות לצ׳אט AI**: מבנה הקובץ, כללים ופרומפט מוכן. להדביק בצ׳אט יחד עם הסילבוס |
| `public/course-template.json` | קובץ דוגמה מלא עם כל סוגי השאלות (זה גם "קורס הדמו") |
| `public/course.schema.json` | JSON Schema לבדיקה אוטומטית |

באפליקציה: **ניהול ← ייבוא קורס**
- "בחר קובץ" או "הדבק JSON". אפשר להדביק את כל תשובת הצ׳אט, כולל ```json וטקסט מסביב.
- קובץ לא תקין: רשימת שגיאות בעברית עם מיקום מדויק ("נושא 2 › שיעור 1 › שאלה 3"). שום דבר לא נשמר.
- לפני ייבוא מוצגת תצוגה מקדימה: מה ייווסף, יעודכן וימחק, ואזהרה אם תימחק התקדמות.
- ייבוא חוזר של אותו קורס (אותו `key`) מעדכן אותו במקום, **ושומר את ההתקדמות**.
- "העתק הוראות לצ׳אט AI", "הורד תבנית", "ייצוא JSON" (לעריכה מחוץ לאפליקציה וייבוא חוזר).
- אפשר גם לערוך ידנית: נושאים, שיעורים, חומרים, שאלות ומבחני סיכום.

## איך הלמידה עובדת

- **חומרי לימוד:** כמה לכל שיעור (סרטון, מאמר, PDF, מסמך, קישור), עם כפתור "פתח", סימון "צפיתי" לכל פריט, ונגן מוטמע לסרטוני YouTube.
- **שאלות:** בחירה אחת, בחירה מרובה (נכון רק אם סומנו בדיוק כל הנכונות), נכון/לא נכון, ושאלה פתוחה (רואים תשובה לדוגמה ומסמנים "צדקתי/טעיתי"). לכל שאלה יש הסבר ומשקל נקודות.
- **ציון עובר:** ברירת מחדל לקורס (80%), ואפשר לקבוע ציון שונה לכל מבחן.
- **נעילה:** שיעור או מבחן סיכום נפתחים רק אחרי מעבר כל המבחנים שלפניהם. ניתן לכיבוי בהגדרות הקורס.
- **תרגול טעויות:** בכל מבחן יש "תרגל רק את הטעויות", ויש עמוד **תרגול** עם כל הטעויות מכל הקורס. שאלה יוצאת מהרשימה כשעונים עליה נכון. כדי לפתוח את ההמשך עדיין צריך לעבור את המבחן המלא.
- **מבחן סיכום נושא:** מופיע בסוף רשימת השיעורים של הנושא, ונועל את הנושא הבא עד שעוברים אותו.

## מבנה

```
src/
  app/                       routes: / · /course · /topics/[id] · /topics/[id]/exam · /lessons/[id] · /practice · /progress · /manage
  components/
    screens/                 מסך לכל route
    lesson/                  עמוד השיעור: material · notes · complete · stepper · section
    quiz/                    question-view (4 סוגים) · runner · quiz-panel · practice
    manage/                  import-card (ייבוא + תצוגה מקדימה) · dialogs (עריכה ידנית)
  lib/
    course-file/             הפורמט: types · validate (שגיאות בעברית) · plan (קובץ ↔ שורות) · preview
    ids.ts                   מזהים דטרמיניסטיים (uuid v5 מ-key) — הבסיס לשמירת התקדמות בייבוא חוזר
    progress.ts              התקדמות, נעילות, "המשך ללמוד", טעויות
    quiz.ts                  בדיקת תשובות וציון לפי נקודות
    edit.ts                  עריכה ידנית (אותם מזהים כמו הייבוא)
    repo/                    Repository: supabase.ts · local.ts
supabase/migrations/         סכמה + RLS + grants
```

## מודל נתונים

תוכן: `courses` → `topics` → `lessons` → `lesson_materials`; `quizzes` (של שיעור או מבחן סיכום של נושא) → `quiz_questions` → `quiz_options`.
מצב הלומד: `lesson_progress`, `material_views`, `quiz_attempts`, `answer_log` (+ view `question_last_results` לתרגול טעויות), `lesson_notes`, `lesson_attachments`.

- מזהי התוכן נגזרים מה-`key` שבקובץ, ולכן ייבוא חוזר מעדכן שורות במקום ליצור חדשות.
- הפרדה בין תוכן למצב לומד: כשתתווסף התחברות, רק טבלאות המצב צריכות `user_id`.
- `set_active_course()`: החלפת הקורס הפעיל בפעולה אטומית אחת.

## TODO לשלבים הבאים

- **העלאת קבצים:** ה-UI ומבנה הנתונים קיימים. לחבר: bucket בשם `lesson-files` ב-Supabase Storage, לממש `uploadAttachment` ב-`src/lib/repo/supabase.ts` (יש שם הערה עם הקוד), ולהפעיל את ה-input ב-`src/components/lesson/notes.tsx`.
- **Google Login:** להפעיל Google provider ב-Supabase Auth; `signInWithOAuth({ provider: "google" })`; route `app/auth/callback`; `proxy.ts` לרענון session; להוסיף `user_id` לטבלאות המצב ולהחליף את `mvp_full_access` ב-`using (user_id = auth.uid())`.

## בדיקות שבוצעו

21 תרחישים אוטומטיים בדפדפן (Playwright), גם במצב מקומי וגם מול Postgres + PostgREST (השכבה ש-Supabase משתמשת בה): טעינת דמו, נעילות, חומרים, ארבעת סוגי השאלות, ציון לפי נקודות, כישלון ומעבר, תרגול טעויות בשיעור ובקורס, מבחן סיכום שפותח נושא, ייבוא חוזר ששומר התקדמות, אזהרת מחיקה, קובץ שגוי, ייצוא (נבדק מול ה-Schema), עריכה ידנית, נגן YouTube, כיבוי נעילה, שני קורסים, ו-responsive (טלפון / אייפד / אייפד לרוחב).
