-- Mission 07: Cloud sync schema with Row Level Security
-- Run this in Supabase Dashboard → SQL Editor

create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  notes text not null default '',
  due_date date,
  quadrant text not null,
  completed boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  doing_now_id text,
  plan_mode text not null default 'auto',
  dismissed_ids jsonb not null default '[]'::jsonb,
  plan_hidden boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;
alter table public.user_preferences enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;

create policy "tasks_select_own"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "tasks_insert_own"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "tasks_update_own"
  on public.tasks for update
  using (auth.uid() = user_id);

create policy "tasks_delete_own"
  on public.tasks for delete
  using (auth.uid() = user_id);

drop policy if exists "prefs_select_own" on public.user_preferences;
drop policy if exists "prefs_insert_own" on public.user_preferences;
drop policy if exists "prefs_update_own" on public.user_preferences;

create policy "prefs_select_own"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "prefs_insert_own"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "prefs_update_own"
  on public.user_preferences for update
  using (auth.uid() = user_id);
