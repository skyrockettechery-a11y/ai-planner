# Known Issues

Documented problems, causes, and workarounds encountered during development and production use.

**Last updated:** July 2026

---

## Authentication

### "PKCE code verifier not found in storage" (magic link) — fixed in Mission 11

**Symptom:** Clicking the email link returns to the app signed out; the terminal shows `[auth] exchangeCodeForSession failed: PKCE code verifier not found in storage.`

**How the flow works:** `signInWithOtp` in the browser stores a one-time *code verifier* in the `sb-<ref>-auth-token-code-verifier` cookie. The email link comes back to `/auth/callback?code=…`, which must receive that cookie to exchange the code. The error means the callback request didn't carry it.

**Causes found (all reproduced locally and fixed):**
1. **Redirect URL fell back to the Site URL.** The app requested `…/auth/callback?next=/`; Supabase matches redirect URLs against its allow-list as globs over the full URL, so an exact entry `http://localhost:3000/auth/callback` didn't match and the link went to the Site URL (production), where this browser's verifier cookie doesn't exist. This explains links that landed on production; a link that reaches `localhost…/auth/callback` and still fails points to cause 2 or 3. *Fix:* the app now requests exactly `<origin>/auth/callback`.
2. **The middleware signed out a stale session on the way to the callback.** With an old/revoked session cookie in the browser, `getUser()` in the middleware triggered auth-js's sign-out cleanup, which also deletes the PKCE verifier — before the callback ran. This happened on `/auth/callback` itself and on any page a code landed on (e.g. `/?code=`) before being forwarded. *Fix:* the middleware skips session refresh on `/auth/callback` and forwards sign-in params to it *before* any session refresh.
3. **The same code was exchanged more than once in the browser.** When a code reached a page, both the Supabase client (`detectSessionInUrl`) and `AuthSessionHandler` (twice under React Strict Mode) exchanged it; all but the first failed with this message. *Fix:* `detectSessionInUrl: false` and a once-per-page-load guard that stores no URL (codes/tokens aren't kept in memory). A related pre-existing bug (page stuck on "Loading your tasks…" after client-side sign-in) was fixed too.

**If it still happens:** read the `[auth/callback] Auth failed:` line. `code verifier cookie: missing` means the link opened somewhere without this browser's cookie — check the address bar shows the **same host** you signed in from (`localhost` ≠ `127.0.0.1` ≠ production), and the same browser profile. `present` means a different cause (e.g. expired or reused link — request a new one).

**Alternative (needs approval):** a token-hash email template (`verifyOtp`) needs no verifier cookie at all — see [DECISIONS.md](./DECISIONS.md).

---

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

### Dev-only `npm audit` findings

**Symptom:** `npm audit` (including dev dependencies) reports high-severity advisories in `brace-expansion`, `braces`/`micromatch`/`fast-glob`, `js-yaml`, `browserslist`, `@babel/core`.

**Cause:** Transitive dependencies of ESLint, `eslint-config-next` and the TypeScript/Tailwind build tooling. They run only on developer machines and in CI against this repo's own code; none ship in the deployed app. `npm audit --omit=dev` reports **0** vulnerabilities (since Next.js 16.3.8, Mission 11).

**Fix:** Not urgent. The `braces` chain's only suggested fix downgrades `eslint-config-next` to 14.x (breaking), so it waits for upstream. The others can be lifted with a non-forced `npm audit fix` in a separate dependency-maintenance change. Never use `npm audit fix --force`.

### `middleware` file convention deprecated (Next.js 16)

**Symptom:** `next build` warns: *The "middleware" file convention is deprecated. Please use "proxy" instead.*

**Cause:** Next.js 16 renamed `middleware.ts` to `proxy.ts`. The existing middleware still works (session refresh, sign-in `?code=` redirect).

**Fix:** Planned as a separate mission. Renaming touches Supabase Auth session handling, so it needs its own regression test of sign-in and sync.

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
