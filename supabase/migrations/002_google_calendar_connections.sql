-- Mission 11: Google Calendar Integration Phase 1 (free/busy availability)
-- Run this in Supabase Dashboard → SQL Editor after 001_cloud_sync.sql.
--
-- Security model:
--   * One row per Supabase user (user_id is the primary key).
--   * The Google refresh token is stored AES-256-GCM encrypted by the
--     Next.js server (key: GOOGLE_TOKEN_ENCRYPTION_KEY), bound to user_id.
--   * Row Level Security is enabled with NO policies, and all table privileges
--     are revoked from the anon and authenticated roles. The browser (anon key
--     + user JWT) therefore cannot select, insert, update or delete rows here.
--   * Only server-side route handlers access this table, using the Supabase
--     service-role key (SUPABASE_SERVICE_ROLE_KEY, never exposed to the
--     browser), always filtered by the user id taken from the verified
--     Supabase session.
--   * Existing tables (tasks, user_preferences) are not modified.

create table if not exists public.google_calendar_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token_ciphertext text not null,
  scope text not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_calendar_connections enable row level security;

-- Deny-by-default: no policies for anon/authenticated, and no privileges.
revoke all on table public.google_calendar_connections from anon;
revoke all on table public.google_calendar_connections from authenticated;
