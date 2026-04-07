-- Ascend Supabase schema
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  total_xp integer not null default 0,
  level integer not null default 1,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  created_at timestamp with time zone default now()
);

create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  tasks jsonb not null,
  completed jsonb not null,
  created_at timestamp with time zone default now(),
  unique(user_id, date)
);

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

alter table public.profiles enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.history enable row level security;
alter table public.weekly_reviews enable row level security;

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
