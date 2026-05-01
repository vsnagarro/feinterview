-- Canonical schema repair and unification.

create extension if not exists "pgcrypto";

alter table if exists sessions enable row level security;
alter table if exists code_submissions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sessions' and policyname = 'admin_all_sessions'
  ) then
    create policy "admin_all_sessions" on sessions for all to authenticated using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'code_submissions' and policyname = 'admin_all_code_submissions'
  ) then
    create policy "admin_all_code_submissions" on code_submissions for all to authenticated using (true) with check (true);
  end if;
end $$;

create table if not exists session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  question_id uuid references questions(id) on delete set null,
  question text not null,
  answer text not null,
  order_index integer not null default 0,
  asked boolean not null default false,
  rating integer check (rating between 1 and 5)
);

create table if not exists code_challenges (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id uuid references sessions(id) on delete cascade,
  title text not null,
  problem_statement text not null,
  starter_code text,
  supported_languages text[] not null default '{"javascript","typescript"}',
  time_limit_minutes integer
);

create table if not exists challenge_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  challenge_id uuid not null references code_challenges(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'base64url'),
  expires_at timestamptz not null,
  is_active boolean not null default true,
  opened_at timestamptz,
  candidate_name text
);

create table if not exists challenge_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  link_id uuid not null references challenge_links(id) on delete cascade,
  language text not null,
  code text not null,
  is_snapshot boolean not null default false,
  ai_analysis jsonb
);

create table if not exists live_code_state (
  link_id uuid primary key references challenge_links(id) on delete cascade,
  language text not null default 'javascript',
  code text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists idx_session_questions_session_id on session_questions(session_id);
create index if not exists idx_code_challenges_session_id on code_challenges(session_id);
create index if not exists idx_challenge_links_challenge_id on challenge_links(challenge_id);
create index if not exists idx_challenge_submissions_link_id on challenge_submissions(link_id);
create index if not exists challenge_links_token_idx on challenge_links(token);

alter table if exists session_questions enable row level security;
alter table if exists code_challenges enable row level security;
alter table if exists challenge_links enable row level security;
alter table if exists challenge_submissions enable row level security;
alter table if exists live_code_state enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'session_questions' and policyname = 'admin_all_session_questions') then
    create policy "admin_all_session_questions" on session_questions for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'code_challenges' and policyname = 'admin_all_code_challenges') then
    create policy "admin_all_code_challenges" on code_challenges for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'challenge_links' and policyname = 'admin_all_challenge_links') then
    create policy "admin_all_challenge_links" on challenge_links for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'challenge_submissions' and policyname = 'admin_all_challenge_submissions') then
    create policy "admin_all_challenge_submissions" on challenge_submissions for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'live_code_state' and policyname = 'admin_all_live_code_state') then
    create policy "admin_all_live_code_state" on live_code_state for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'challenge_submissions' and policyname = 'public_insert_submissions') then
    create policy "public_insert_submissions" on challenge_submissions for insert to anon with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'live_code_state' and policyname = 'public_write_live_code') then
    create policy "public_write_live_code" on live_code_state for all to anon using (true) with check (true);
  end if;
end $$;

do $$
declare
  constraint_name text;
begin
  select c.conname into constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_class rt on rt.oid = c.confrelid
  where t.relname = 'session_questions'
    and rt.relname = 'interview_sessions'
    and c.contype = 'f';

  if constraint_name is not null then
    execute format('alter table session_questions drop constraint %I', constraint_name);
    alter table session_questions add constraint session_questions_session_id_fkey foreign key (session_id) references sessions(id) on delete cascade;
  end if;
end $$;

do $$
declare
  constraint_name text;
begin
  select c.conname into constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_class rt on rt.oid = c.confrelid
  where t.relname = 'code_challenges'
    and rt.relname = 'interview_sessions'
    and c.contype = 'f';

  if constraint_name is not null then
    execute format('alter table code_challenges drop constraint %I', constraint_name);
    alter table code_challenges add constraint code_challenges_session_id_fkey foreign key (session_id) references sessions(id) on delete cascade;
  end if;
end $$;
