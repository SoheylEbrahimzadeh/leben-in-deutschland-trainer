-- LiD Trainer — cloud persistence schema (Supabase Postgres)
--
-- Run this once in the Supabase project's SQL editor (or via `supabase db
-- push` if you use the CLI) after creating the project. It creates exactly
-- two application tables; everything about the "User" entity in the app's
-- data model is already covered by Supabase's built-in `auth.users` table,
-- so no separate `profiles` table is created (kept intentionally minimal):
--
--   User.user_id             -> auth.users.id
--   User.email/provider id   -> auth.users.email
--   User.created_at          -> auth.users.created_at
--   User.last_login          -> auth.users.last_sign_in_at
--
-- Both tables below store ONLY progress metadata (counters, letters,
-- timestamps) keyed by the existing immutable question IDs from
-- DATA/*.md (via APP/src/data/questions.generated.json). They never store
-- question text, options, translations, or any other content from the
-- verified DATA files — the client already has that bundled locally and
-- looks it up by id, so duplicating it here would be unnecessary and would
-- risk drifting out of sync with the verified source.

-- =============================================================================
-- question_progress — one row per (user, question), mirrors
-- APP/src/lib/progressStore.js's per-question record 1:1.
-- =============================================================================
create table if not exists public.question_progress (
  user_id        uuid        not null references auth.users(id) on delete cascade,
  question_id    text        not null,
  attempts       integer     not null default 0,
  correct_count  integer     not null default 0,
  wrong_count    integer     not null default 0,
  mistake_count  integer     not null default 0,
  -- "confidence" mirrors progressStore.js's `streak` (consecutive correct
  -- answers since the last mistake) — the same signal MASTERED status is
  -- computed from locally, reused here rather than inventing a new metric.
  confidence     integer     not null default 0,
  last_answer    text,                 -- last selected option letter (A/B/C/D), progressStore.js `lastSelected`
  -- The question's correct option letter, looked up once from the bundled
  -- (immutable) question data when a row is first written. A single
  -- letter, not the source question/options — not a duplication of
  -- DATA/*.md content, just enough to read this table on its own.
  correct_answer text,
  -- status / is_red_alert are ALWAYS derived, never written by the app —
  -- generated columns so they can never drift from the raw counters, and
  -- so they stay queryable/orderable straight from SQL. The thresholds
  -- mirror progressStore.js's RED_ALERT_THRESHOLD=3 / MASTERED_STREAK=2
  -- exactly; if those constants ever change, update this expression too.
  status text generated always as (
    case
      when attempts = 0 then 'UNPRACTICED'
      when mistake_count >= 3 then 'WEAK'
      when confidence >= 2 then 'MASTERED'
      when mistake_count >= 1 then 'WEAK'
      else 'UNCERTAIN'
    end
  ) stored,
  is_red_alert boolean generated always as (mistake_count >= 3) stored,
  updated_at     timestamptz not null default now(),
  primary key (user_id, question_id)
);

alter table public.question_progress enable row level security;

drop policy if exists "question_progress: select own" on public.question_progress;
create policy "question_progress: select own"
  on public.question_progress for select
  using (auth.uid() = user_id);

drop policy if exists "question_progress: insert own" on public.question_progress;
create policy "question_progress: insert own"
  on public.question_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "question_progress: update own" on public.question_progress;
create policy "question_progress: update own"
  on public.question_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "question_progress: delete own" on public.question_progress;
create policy "question_progress: delete own"
  on public.question_progress for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- exam_attempts — one row per completed 33-question mock exam.
-- `question_results` reuses the EXACT shape APP/src/lib/mockExam.js's
-- scoreMockExam() already produces for `.results`: an ordered array of
-- {id, selected, correct, isCorrect} covering all 33 questions. Storing it
-- as jsonb means the exam-review screen (Part 1) can be rehydrated from the
-- cloud with no server-side transformation, using the same ExamReview
-- component that renders a freshly-completed exam.
-- =============================================================================
create table if not exists public.exam_attempts (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  -- Client-generated identifier for this exam sitting — reuses
  -- scoreMockExam()'s own `result.date` ISO timestamp, so no new ID scheme
  -- is introduced.
  exam_id          text        not null,
  created_at       timestamptz not null default now(),
  score            integer     not null, -- correct answers out of 33 (same value as correct_count; kept as `score` to match the spec's data model naming)
  correct_count    integer     not null,
  wrong_count      integer     not null,
  percentage       numeric(4,1) not null,
  question_results jsonb       not null,
  unique (user_id, exam_id)
);

alter table public.exam_attempts enable row level security;

drop policy if exists "exam_attempts: select own" on public.exam_attempts;
create policy "exam_attempts: select own"
  on public.exam_attempts for select
  using (auth.uid() = user_id);

drop policy if exists "exam_attempts: insert own" on public.exam_attempts;
create policy "exam_attempts: insert own"
  on public.exam_attempts for insert
  with check (auth.uid() = user_id);

drop policy if exists "exam_attempts: update own" on public.exam_attempts;
create policy "exam_attempts: update own"
  on public.exam_attempts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "exam_attempts: delete own" on public.exam_attempts;
create policy "exam_attempts: delete own"
  on public.exam_attempts for delete
  using (auth.uid() = user_id);

create index if not exists exam_attempts_user_created_idx
  on public.exam_attempts (user_id, created_at desc);
