-- Lemidali — schema
-- Course → Topics → Lessons (materials + quiz); topics may have a final exam.
--
-- Design notes
-- * Every row belongs to one signed-in user (user_id, default auth.uid()).
--   RLS lets each user see and change only their own rows.
-- * Sign-ups are limited to the emails in private.allowed_emails (personal app).
-- * Content rows have deterministic ids (uuid v5 of the course key + item key,
--   computed in the app), so re-importing a course file updates rows in place
--   and keeps progress. Keys are the stable identifiers from the course file.
-- * "position" is used instead of "order" (reserved word in SQL).

create table public.courses (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id                uuid primary key,
  key               text not null,
  title             text not null,
  description       text not null default '',
  passing_score     integer not null default 80 check (passing_score between 0 and 100),
  lock_until_passed boolean not null default true,
  is_active         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, key)
);
-- at most one active course per user
create unique index courses_one_active on public.courses(user_id) where is_active;

create table public.topics (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id          uuid primary key,
  course_id   uuid not null references public.courses(id) on delete cascade,
  key         text not null,
  title       text not null,
  description text not null default '',
  position    integer not null default 0,
  unique (course_id, key)
);
create index topics_course_idx on public.topics(course_id, position);

create table public.lessons (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id               uuid primary key,
  topic_id         uuid not null references public.topics(id) on delete cascade,
  key              text not null,
  title            text not null,
  description      text not null default '',
  position         integer not null default 0,
  duration_minutes integer not null default 60 check (duration_minutes > 0)
);
create index lessons_topic_idx on public.lessons(topic_id, position);

create type public.material_type as enum ('video', 'article', 'pdf', 'document', 'link');

create table public.lesson_materials (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id               uuid primary key,
  lesson_id        uuid not null references public.lessons(id) on delete cascade,
  key              text not null,
  type             public.material_type not null default 'link',
  title            text not null,
  url              text not null,
  duration_minutes integer check (duration_minutes > 0),
  note             text not null default '',
  position         integer not null default 0
);
create index lesson_materials_lesson_idx on public.lesson_materials(lesson_id, position);

-- A quiz belongs to exactly one lesson (lesson quiz) or one topic (final exam).
create table public.quizzes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id            uuid primary key,
  lesson_id     uuid unique references public.lessons(id) on delete cascade,
  topic_id      uuid unique references public.topics(id) on delete cascade,
  title         text not null default '',
  passing_score integer check (passing_score between 0 and 100), -- null → course default
  check (num_nonnulls(lesson_id, topic_id) = 1)
);

create type public.question_type as enum ('single', 'multiple', 'true_false', 'open');

create table public.quiz_questions (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id           uuid primary key,
  quiz_id      uuid not null references public.quizzes(id) on delete cascade,
  key          text not null,
  type         public.question_type not null,
  question     text not null,
  explanation  text not null default '',
  model_answer text not null default '',   -- for type 'open'
  points       integer not null default 1 check (points between 1 and 10),
  position     integer not null default 0
);
create index quiz_questions_quiz_idx on public.quiz_questions(quiz_id, position);

-- Options for single / multiple / true_false (true_false = two options).
create table public.quiz_options (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id          uuid primary key,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  text        text not null,
  is_correct  boolean not null default false,
  position    integer not null default 0
);
create index quiz_options_question_idx on public.quiz_options(question_id, position);

-- ---------- learner state ----------

create type public.lesson_status as enum ('not_started', 'in_progress', 'completed');

create table public.lesson_progress (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lesson_id          uuid primary key references public.lessons(id) on delete cascade,
  status             public.lesson_status not null default 'not_started',
  material_completed boolean not null default false,
  last_opened_at     timestamptz,
  completed_at       timestamptz,
  updated_at         timestamptz not null default now()
);

create table public.material_views (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  material_id uuid primary key references public.lesson_materials(id) on delete cascade,
  viewed_at   timestamptz not null default now()
);

-- One row per full quiz run. score/total are points.
create table public.quiz_attempts (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id           uuid primary key default gen_random_uuid(),
  quiz_id      uuid not null references public.quizzes(id) on delete cascade,
  score        integer not null check (score >= 0),
  total        integer not null check (total > 0),
  percent      integer not null check (percent between 0 and 100),
  passed       boolean not null,
  completed_at timestamptz not null default now()
);
create index quiz_attempts_quiz_idx on public.quiz_attempts(quiz_id, completed_at);

-- Every answered question (full quiz or mistakes practice).
-- The latest row per question decides whether it is in "my mistakes".
create table public.answer_log (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  attempt_id  uuid references public.quiz_attempts(id) on delete cascade, -- null = practice
  is_correct  boolean not null,
  answered_at timestamptz not null default now()
);
create index answer_log_question_idx on public.answer_log(question_id, answered_at desc);

create view public.question_last_results with (security_invoker = on) as
  select distinct on (question_id) question_id, is_correct, answered_at
  from public.answer_log
  order by question_id, answered_at desc;

create table public.lesson_notes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lesson_id  uuid primary key references public.lessons(id) on delete cascade,
  content    text not null default '',
  updated_at timestamptz not null default now()
);

create table public.lesson_attachments (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons(id) on delete cascade,
  file_name  text not null,
  file_url   text not null,         -- Supabase Storage path or public URL
  mime_type  text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
create index lesson_attachments_lesson_idx on public.lesson_attachments(lesson_id);

-- ---------- access ----------
-- Signed-in users only; each user sees only their own rows.

do $$
declare t text;
begin
  foreach t in array array[
    'courses','topics','lessons','lesson_materials','quizzes','quiz_questions','quiz_options',
    'lesson_progress','material_views','quiz_attempts','answer_log','lesson_notes','lesson_attachments'
  ] loop
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own_rows" on public.%I for all to authenticated '
      'using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create index on public.%I(user_id)', t);
  end loop;
end $$;

revoke all on public.question_last_results from anon;
grant select on public.question_last_results to authenticated;

-- Switch the active course atomically. Security invoker: RLS limits it to the caller's courses.
create function public.set_active_course(course_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.courses set is_active = false where is_active and id <> course_id;
  update public.courses set is_active = true where id = course_id;
end $$;
revoke execute on function public.set_active_course(uuid) from public, anon;
grant execute on function public.set_active_course(uuid) to authenticated;

-- ---------- who may sign up ----------
-- Personal app: only these emails can create an account (email+password or Google).
-- Add someone:  insert into private.allowed_emails values ('name@example.com');

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.allowed_emails (email text primary key check (email = lower(email)));
insert into private.allowed_emails values ('yehonatan.hcoen@gmail.com');

create function private.check_allowed_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.allowed_emails where email = lower(new.email)) then
    raise exception 'Sign-ups are limited to the app owner' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger only_allowed_emails before insert on auth.users
  for each row execute function private.check_allowed_email();
