# Mission 07 — Cloud Sync Foundation

## Goal
Enable the same user to sync AI Planner data across phone and desktop.

Use Supabase Auth + Supabase Postgres.

## Required Features

### 1. Supabase Setup
Add Supabase client support for Next.js.

Required env vars:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Do not hardcode secrets.

### 2. Authentication
Add simple login/logout.

Preferred:
- Google login

Acceptable fallback:
- email magic link

### 3. Cloud Tasks
Store tasks in Supabase with user ownership.

Each task must belong to one user.

Users must only see their own tasks.

### 4. Cloud Preferences
Sync:
- Doing Now task id
- Today’s Plan mode
- dismissed recommendation ids
- Today’s Plan hidden state

### 5. Local Data Migration
If user has localStorage tasks before login:
- offer an Import local tasks action after login
- do not auto-delete local data
- avoid duplicates where reasonable

### 6. Preserve Local UX
The app should still feel fast and minimal.

Avoid adding clutter.

## Security Requirements
- Use Supabase Row Level Security
- Users can only access their own rows
- No admin dashboard
- No viewing other users’ plans

## Constraints
Do not:
- add real AI API
- add Google Calendar
- redesign the whole app
- expose secrets
- add admin access

## Validation
Before stopping:
- lint passes
- build passes
- login/logout works
- tasks sync across two browsers/devices
- preferences sync
- local task import works
- user data isolation works

## Deliverables
Report:
1. Supabase tables created
2. Auth method used
3. Files modified
4. How sync works
5. How to test phone/desktop sync
6. Any manual Supabase dashboard steps needed