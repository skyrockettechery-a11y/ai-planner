# Deployment Guide

How AI Planner is deployed and configured for production.

**Production URL:** https://ai-planner-taupe.vercel.app

---

## Overview

| Service | Role |
|---------|------|
| **Vercel** | Hosts the Next.js app, builds on push |
| **Supabase** | Auth (magic link, future Google OAuth) + Postgres (tasks, preferences) |
| **GitHub** | Source repository connected to Vercel |

---

## Prerequisites

- Node.js 20+ (local development)
- GitHub repository with the project
- Supabase project (free tier sufficient for current scale)
- Vercel account linked to GitHub

---

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### Optional: local cloud sync

Create `.env.local` in the project root (never commit this file):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Restart the dev server after changing env vars.

Without these variables, the app works in **local-only mode** (localStorage only).

---

## Supabase Setup

### 1. Create a project

1. Go to [supabase.com](https://supabase.com) and create a project
2. Note the **Project URL** and **anon public** key (Settings → API)

### 2. Run the database migration

In Supabase Dashboard → **SQL Editor**, run the contents of:

```
supabase/migrations/001_cloud_sync.sql
```

This creates:
- `public.tasks` with RLS policies
- `public.user_preferences` with RLS policies

### 3. Configure Auth

**Email magic link (working today):**

1. Authentication → Providers → Email — ensure enabled
2. Authentication → URL Configuration:
   - **Site URL:** `https://ai-planner-taupe.vercel.app` (or your Vercel URL)
   - **Redirect URLs:** add `https://ai-planner-taupe.vercel.app/auth/callback` and `http://localhost:3000/auth/callback`

**Google OAuth (not fully enabled):**

1. Authentication → Providers → Google — configure Client ID and Secret from Google Cloud Console
2. Add authorized redirect URI in Google Console matching Supabase callback URL
3. Enable the provider in Supabase

Until Google is configured, use email magic link.

---

## Vercel Deployment

### Initial setup (Mission 06)

1. Push repository to GitHub
2. Import project in Vercel dashboard
3. Framework preset: **Next.js**
4. Add environment variables (Production + Preview recommended):

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

5. Deploy

### Subsequent deploys

Push to the connected branch — Vercel rebuilds automatically.

### Verify deployment

```bash
npm run lint
npm run build
```

Then on the live URL:

- [ ] App loads on desktop and mobile
- [ ] Add / complete / restore tasks work
- [ ] Sign in with email magic link
- [ ] Tasks sync after refresh on a second device/browser

---

## Environment Variable Checklist

| Check | Action |
|-------|--------|
| URL matches Supabase project | Copy from Settings → API, not a stale/old project |
| Anon key matches same project | Pair URL and key from the same Supabase project |
| Vercel env vars set for Production | Redeploy after changing env vars |
| Redirect URLs include production domain | Supabase Auth → URL Configuration |

Wrong URL or mismatched keys cause **failed fetch / DNS errors** in the browser. See [KNOWN_ISSUES.md](./KNOWN_ISSUES.md).

---

## Diagnostic Script

A Supabase connectivity diagnostic exists for troubleshooting:

```bash
npx tsx scripts/diagnose-supabase.ts
```

Requires env vars to be set locally. Does not modify data.

---

## Rollback

Vercel keeps deployment history. Use the Vercel dashboard to promote a previous deployment if a bad release ships.

Database changes in Supabase are not automatically rolled back — test migrations in a staging project when possible.

---

## Related Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — how auth and sync work
- [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) — deployment and auth pitfalls
- [MISSION_06.md](../MISSION_06.md) — original deploy mission spec
- [MISSION_07.md](../MISSION_07.md) — cloud sync mission spec
