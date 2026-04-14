-- Ascend Supabase schema
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  total_xp integer not null default 0,
  level integer not null default 1,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  is_paid_user boolean not null default false,
  created_at timestamp with time zone default now()
);

-- Existing databases: add column if missing
alter table public.profiles add column if not exists is_paid_user boolean not null default false;
alter table public.profiles add column if not exists total_strength_xp integer not null default 0;
alter table public.profiles add column if not exists strength_level integer not null default 1;
alter table public.profiles add column if not exists system_integrity integer not null default 100;
alter table public.profiles add column if not exists strength_gate_sessions integer not null default 0;
alter table public.profiles add column if not exists strength_gate_dates jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists strength_gate_tracked_level integer not null default 1;
alter table public.profiles add column if not exists training_level text not null default 'intermediate';

-- Baseline (Day 1) + latest self-reported metrics for progression feedback
alter table public.profiles add column if not exists pushups_max integer;
alter table public.profiles add column if not exists squats_max integer;
alter table public.profiles add column if not exists plank_time integer;
alter table public.profiles add column if not exists current_pushups_max integer;
alter table public.profiles add column if not exists current_squats_max integer;
alter table public.profiles add column if not exists current_plank_time integer;
alter table public.profiles add column if not exists baseline_completed_at timestamp with time zone;

create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  tasks jsonb not null,
  completed jsonb not null,
  daily_refresh_count integer not null default 0,
  created_at timestamp with time zone default now(),
  unique(user_id, date)
);
alter table public.daily_tasks add column if not exists daily_refresh_count integer not null default 0;

create table if not exists public.history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  xp_earned integer not null default 0,
  completed_all boolean not null default false,
  streak integer not null default 0,
  created_at timestamp with time zone default now(),
  unique(user_id, date)
);

create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_key text not null,
  went_well text,
  needs_improvement text,
  next_change text,
  created_at timestamp with time zone default now(),
  unique(user_id, week_key)
);

create table if not exists public.user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists public.exercise_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  last_weight numeric not null,
  last_reps jsonb not null,
  sets_completed integer not null,
  effort_rating text not null,
  session_date date not null,
  created_at timestamp with time zone default now()
);
alter table public.exercise_history add column if not exists effort_rating text;

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_type text not null,
  completed_at timestamp with time zone not null default now(),
  xp_earned integer not null default 0,
  total_volume numeric not null default 0,
  fatigue_state text not null default 'normal',
  created_at timestamp with time zone default now()
);

create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  exercise_name text not null,
  weight numeric not null,
  reps jsonb not null,
  sets integer not null,
  rpe text not null,
  logged_at timestamp with time zone not null default now(),
  created_at timestamp with time zone default now()
);

create index if not exists user_events_user_id_created_at_idx
  on public.user_events (user_id, created_at desc);
create index if not exists exercise_history_user_exercise_date_idx
  on public.exercise_history (user_id, exercise_name, session_date desc);
create index if not exists training_sessions_user_completed_idx
  on public.training_sessions (user_id, completed_at desc);
create index if not exists exercise_logs_user_logged_idx
  on public.exercise_logs (user_id, logged_at desc);
create index if not exists exercise_logs_session_idx
  on public.exercise_logs (session_id);

alter table public.profiles enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.history enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.user_events enable row level security;
alter table public.exercise_history enable row level security;
alter table public.training_sessions enable row level security;
alter table public.exercise_logs enable row level security;

drop policy if exists "profiles_owner_select" on public.profiles;
drop policy if exists "profiles_owner_insert" on public.profiles;
drop policy if exists "profiles_owner_update" on public.profiles;
drop policy if exists "profiles_owner_delete" on public.profiles;
create policy "profiles_owner_select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_owner_insert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_owner_update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_owner_delete" on public.profiles
  for delete using (auth.uid() = id);

drop policy if exists "daily_tasks_owner_select" on public.daily_tasks;
drop policy if exists "daily_tasks_owner_insert" on public.daily_tasks;
drop policy if exists "daily_tasks_owner_update" on public.daily_tasks;
drop policy if exists "daily_tasks_owner_delete" on public.daily_tasks;
create policy "daily_tasks_owner_select" on public.daily_tasks
  for select using (auth.uid() = user_id);
create policy "daily_tasks_owner_insert" on public.daily_tasks
  for insert with check (auth.uid() = user_id);
create policy "daily_tasks_owner_update" on public.daily_tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_tasks_owner_delete" on public.daily_tasks
  for delete using (auth.uid() = user_id);

drop policy if exists "history_owner_select" on public.history;
drop policy if exists "history_owner_insert" on public.history;
drop policy if exists "history_owner_update" on public.history;
drop policy if exists "history_owner_delete" on public.history;
create policy "history_owner_select" on public.history
  for select using (auth.uid() = user_id);
create policy "history_owner_insert" on public.history
  for insert with check (auth.uid() = user_id);
create policy "history_owner_update" on public.history
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "history_owner_delete" on public.history
  for delete using (auth.uid() = user_id);

drop policy if exists "weekly_reviews_owner_select" on public.weekly_reviews;
drop policy if exists "weekly_reviews_owner_insert" on public.weekly_reviews;
drop policy if exists "weekly_reviews_owner_update" on public.weekly_reviews;
drop policy if exists "weekly_reviews_owner_delete" on public.weekly_reviews;
create policy "weekly_reviews_owner_select" on public.weekly_reviews
  for select using (auth.uid() = user_id);
create policy "weekly_reviews_owner_insert" on public.weekly_reviews
  for insert with check (auth.uid() = user_id);
create policy "weekly_reviews_owner_update" on public.weekly_reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weekly_reviews_owner_delete" on public.weekly_reviews
  for delete using (auth.uid() = user_id);

drop policy if exists "user_events_owner_insert" on public.user_events;
drop policy if exists "user_events_owner_select" on public.user_events;
create policy "user_events_owner_insert" on public.user_events
  for insert with check (auth.uid() = user_id);
create policy "user_events_owner_select" on public.user_events
  for select using (auth.uid() = user_id);

drop policy if exists "exercise_history_owner_insert" on public.exercise_history;
drop policy if exists "exercise_history_owner_select" on public.exercise_history;
create policy "exercise_history_owner_insert" on public.exercise_history
  for insert with check (auth.uid() = user_id);
create policy "exercise_history_owner_select" on public.exercise_history
  for select using (auth.uid() = user_id);

drop policy if exists "training_sessions_owner_insert" on public.training_sessions;
drop policy if exists "training_sessions_owner_select" on public.training_sessions;
drop policy if exists "training_sessions_owner_update" on public.training_sessions;
drop policy if exists "training_sessions_owner_delete" on public.training_sessions;
create policy "training_sessions_owner_insert" on public.training_sessions
  for insert with check (auth.uid() = user_id);
create policy "training_sessions_owner_select" on public.training_sessions
  for select using (auth.uid() = user_id);
create policy "training_sessions_owner_update" on public.training_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "training_sessions_owner_delete" on public.training_sessions
  for delete using (auth.uid() = user_id);

drop policy if exists "exercise_logs_owner_insert" on public.exercise_logs;
drop policy if exists "exercise_logs_owner_select" on public.exercise_logs;
drop policy if exists "exercise_logs_owner_update" on public.exercise_logs;
drop policy if exists "exercise_logs_owner_delete" on public.exercise_logs;
create policy "exercise_logs_owner_insert" on public.exercise_logs
  for insert with check (auth.uid() = user_id);
create policy "exercise_logs_owner_select" on public.exercise_logs
  for select using (auth.uid() = user_id);
create policy "exercise_logs_owner_update" on public.exercise_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "exercise_logs_owner_delete" on public.exercise_logs
  for delete using (auth.uid() = user_id);

/**
 * Called only from the Gumroad webhook API route using the Supabase service role.
 * Looks up auth.users by email (case-insensitive), then sets profiles.is_paid_user = true.
 * Inserts a profile row if missing (edge case before trigger ran).
 */
create or replace function public.grant_paid_access_by_email(p_email text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_n int;
begin
  select id into v_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_id is null then
    return json_build_object('ok', false, 'reason', 'user_not_found');
  end if;

  update public.profiles set is_paid_user = true where id = v_id;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    insert into public.profiles (id, is_paid_user)
    values (v_id, true)
    on conflict (id) do update set is_paid_user = true;
  end if;

  return json_build_object('ok', true, 'user_id', v_id);
end;
$$;

revoke all on function public.grant_paid_access_by_email(text) from public;
grant execute on function public.grant_paid_access_by_email(text) to service_role;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();
