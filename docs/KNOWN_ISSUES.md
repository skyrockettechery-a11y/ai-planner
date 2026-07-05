# Known Issues

Documented problems, causes, and workarounds encountered during development and production use.

**Last updated:** July 2026

---

## Authentication

### Email OTP rate limit

**Symptom:** After many login attempts in a short period, Supabase returns a rate-limit error; magic link emails stop arriving.

**Cause:** Supabase Auth throttles OTP/magic-link requests per email/IP.

**Workaround:**
- Wait before retrying (typically 15–60 minutes depending on Supabase tier)
- Use a different email for testing sparingly
- Avoid rapid repeated sign-in attempts during development

**Status:** Expected Supabase behavior; not an app bug.

---

### Magic link sensitive to mobile browser / email app behavior

**Symptom:** Magic link opens in an in-app browser or wrong browser; session may not establish cleanly on the device where the app is installed.

**Cause:** Email clients (Gmail, Outlook, etc.) open links in embedded WebViews that may not share cookies with the user's default browser.

**Workaround:**
- Open the magic link in the **same browser** where you use AI Planner (e.g. "Open in Safari/Chrome" from the email app)
- After landing on the callback URL, return to the app tab and refresh if needed
- On iPhone, prefer opening the production URL in Safari directly after auth

**Status:** Common OAuth/magic-link UX limitation; future Google OAuth may reduce friction once configured.

---

### Stale auth error URL state

**Symptom:** Error messages persist in the URL (`?error=…`) after failed auth; confusing feedback on reload.

**Cause:** Auth callback and client-side flows previously left error query params in the address bar.

**Resolution:** URL cleanup implemented in `lib/auth/cleanAuthUrl.ts`, `AuthSessionHandler`, and related auth helpers.

**If it recurs:** Hard refresh or navigate to `/` without query params; sign out and sign in again.

---

### Google sign-in button not fully working

**Symptom:** Google button visible but sign-in fails or provider unavailable.

**Cause:** Google OAuth provider not fully configured in Supabase and Google Cloud Console.

**Workaround:** Use **email magic link** — verified working in production.

**Status:** Planned future mission (see [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md)).

---

## Configuration & Deployment

### Wrong Supabase URL / env var → failed fetch / DNS errors

**Symptom:** Browser console shows network errors, failed fetch, or DNS resolution failures when loading tasks or signing in.

**Cause:** `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel (or `.env.local`) points to wrong project, typo, or stale deleted project.

**Fix:**
1. Supabase Dashboard → Settings → API — copy URL and anon key from the **same** project
2. Update Vercel environment variables
3. Redeploy
4. Verify locally with `npx tsx scripts/diagnose-supabase.ts`

**Prevention:** Always pair URL and anon key from one Supabase project; redeploy after env changes.

---

## Sync & Session

### Refresh-based sync only (not realtime)

**Symptom:** Changes on one device don't appear on another until refresh or re-focus.

**Cause:** By design — `useCloudSync` loads on login and pushes on debounced local changes; no Supabase realtime subscriptions yet.

**Workaround:** Refresh the page or switch away and back (visibility handler refreshes session).

**Status:** Realtime sync is a planned future mission.

---

### Middleware timeout (historical)

**Symptom:** Requests hang or timeout; app feels stuck loading.

**Cause:** Observed when stale auth cookies/session state conflicted with middleware session refresh.

**Resolution:** Resolved after auth URL cleanup and session handling improvements; clearing cookies for the site also helps.

**If it recurs:** Sign out, clear site cookies for the production domain, sign in again with a fresh magic link.

---

## Local vs Cloud Data

### Duplicate tasks after import

**Symptom:** Same task appears twice after importing local tasks post-login.

**Cause:** Import merges local tasks into cloud state; duplicates possible if the same task was already synced.

**Workaround:** Import banner is optional; dismiss if already synced. Manual delete of duplicates.

**Status:** Import logic avoids duplicates where reasonable; edge cases may remain.

---

## Reporting New Issues

When documenting a new issue, include:

1. **Symptom** — what the user sees
2. **Steps to reproduce**
3. **Environment** — device, browser, signed in or not
4. **Cause** (if known)
5. **Workaround or fix**

Update this file and [PROJECT_STATUS.md](./PROJECT_STATUS.md) if the issue affects shipped capabilities.

---

## Related Docs

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) — env var and Supabase setup
- [ARCHITECTURE.md](./ARCHITECTURE.md) — auth and sync design
- [SYNC_DIAGNOSIS_REPORT.md](../SYNC_DIAGNOSIS_REPORT.md) — detailed sync troubleshooting (historical)
