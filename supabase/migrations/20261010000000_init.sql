-- Lemidali — initial schema
-- Course → Topics → Lessons, with per-lesson quiz, progress, notes and attachments.
--
-- Design notes
-- * "Content" tables (courses, topics, lessons, quiz_*) are separated from
--   "learner state" tables (lesson_progress, quiz_attempts, lesson_notes,
--   lesson_attachments). When Google Login is added, only the learner-state
--   tables need a user_id column + RLS on auth.uid(); content stays shared.
-- * "position" is used instead of "order" (reserved word in SQL).
-- * One quiz per lesson, so questions reference the lesson directly
--   (no separate lesson_quizzes table needed).

create table public.courses (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '',
  created_at  timestamptz not null default now()
);

create table public.topics (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  description text not null default '',
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index topics_course_idx on public.topics(course_id, position);

create table public.lessons (
  id               uuid primary key default gen_random_uuid(),
  topic_id         uuid not null references public.topics(id) on delete cascade,
  title            text not null,
  description      text not null default '',
  position         integer not null default 0,
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  learning_url     text,
  created_at       timestamptz not null default now()
);
create index lessons_topic_idx on public.lessons(topic_id, position);

create table public.quiz_questions (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons(id) on delete cascade,
  question   text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
create index quiz_questions_lesson_idx on public.quiz_questions(lesson_id, position);

create table public.quiz_answers (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  answer      text not null,
  is_correct  boolean not null default false,
  position    integer not null default 0
);
create index quiz_answers_question_idx on public.quiz_answers(question_id, position);
-- exactly one correct answer per question is enforced in the app;
-- this guarantees there is never more than one.
create unique index quiz_answers_one_correct
  on public.quiz_answers(question_id) where is_correct;

-- ---------- learner state ----------

create type public.lesson_status as enum ('not_started', 'in_progress', 'completed');

create table public.lesson_progress (
  lesson_id          uuid primary key references public.lessons(id) on delete cascade,
  status             public.lesson_status not null default 'not_started',
  material_completed boolean not null default false,
  last_opened_at     timestamptz,
  completed_at       timestamptz,
  updated_at         timestamptz not null default now()
);

create table public.quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid not null references public.lessons(id) on delete cascade,
  score        integer not null check (score >= 0),
  total        integer not null check (total > 0),
  completed_at timestamptz not null default now()
);
create index quiz_attempts_lesson_idx on public.quiz_attempts(lesson_id, completed_at);

create table public.lesson_notes (
  lesson_id  uuid primary key references public.lessons(id) on delete cascade,
  content    text not null default '',
  updated_at timestamptz not null default now()
);

create table public.lesson_attachments (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid not null references public.lessons(id) on delete cascade,
  file_name    text not null,
  file_url     text not null,         -- Supabase Storage path or public URL
  mime_type    text,
  size_bytes   bigint,
  created_at   timestamptz not null default now()
);
create index lesson_attachments_lesson_idx on public.lesson_attachments(lesson_id);

-- ---------- access (single-user MVP) ----------
-- No auth yet: the publishable (anon) key may read/write everything.
-- When adding Google Login: drop the "mvp_*" policies, add user_id to the
-- learner-state tables, and create policies "using (user_id = auth.uid())".

do $$
declare t text;
begin
  foreach t in array array[
    'courses','topics','lessons','quiz_questions','quiz_answers',
    'lesson_progress','quiz_attempts','lesson_notes','lesson_attachments'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "mvp_full_access" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
