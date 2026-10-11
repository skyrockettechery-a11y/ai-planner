/**
 * Regression tests for PKCE magic-link sign-in (Mission 11 acceptance blocker:
 * "PKCE code verifier not found in storage").
 *
 * The integration tests run the real @supabase/ssr + auth-js code against a
 * stubbed Supabase Auth API (no network). All tokens and codes are fake.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import {
  codeVerifierCookieName,
  describeAuthCookies,
  isSessionCookieName,
  supabaseAuthStorageKey,
} from "@/lib/auth/authCookies";
import { authCallbackUrl, safeNextPath } from "@/lib/auth/redirect";
import { completeAuthUrlOncePerPageLoad } from "@/lib/auth/runOnce";
import { createBrowserClientFromConfig } from "@/lib/supabase/client";
import { updateSession } from "@/lib/supabase/middleware";

const SUPABASE_URL = "https://testref.supabase.co";
const ANON_KEY = "test-anon-key";
const STORAGE_KEY = "sb-testref-auth-token";
const VERIFIER = codeVerifierCookieName(STORAGE_KEY);

// --- Fake Supabase Auth API -------------------------------------------------

interface FakeAuth {
  calls: string[];
  lastChallenge: string | null;
}

const realFetch = globalThis.fetch;
let auth: FakeAuth;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function b64url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function fakeJwt(sessionId: string, expSeconds: number): string {
  return [
    b64url('{"alg":"HS256","typ":"JWT"}'),
    b64url(JSON.stringify({ sub: "user-1", session_id: sessionId, exp: expSeconds })),
    "sig",
  ].join(".");
}

function freshSession() {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: fakeJwt("new-session", now + 3600),
    refresh_token: "new-refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    user: { id: "user-1", aud: "authenticated", email: "tester@example.com" },
  };
}

function installFakeAuth() {
  auth = { calls: [], lastChallenge: null };
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const route = `${init?.method ?? "GET"} ${url.pathname}${
      url.searchParams.get("grant_type") ? `?${url.searchParams.get("grant_type")}` : ""
    }`;
    auth.calls.push(route);

    if (route === "POST /auth/v1/otp") {
      auth.lastChallenge = body.code_challenge ?? null;
      return json(200, {});
    }
    if (route === "POST /auth/v1/token?pkce") {
      const matches =
        auth.lastChallenge !== null &&
        body.auth_code === "good-code" &&
        createHash("sha256").update(body.code_verifier ?? "").digest("base64url") ===
          auth.lastChallenge;
      return matches
        ? json(200, freshSession())
        : json(400, { error_code: "bad_code_verifier", msg: "invalid flow state" });
    }
    if (route === "POST /auth/v1/token?refresh_token") {
      return json(400, {
        error_code: "refresh_token_not_found",
        msg: "Invalid Refresh Token: Refresh Token Not Found",
      });
    }
    if (route === "GET /auth/v1/user") {
      return json(403, {
        error_code: "session_not_found",
        msg: "Session from session_id claim in JWT does not exist",
      });
    }
    return json(404, {});
  }) as typeof fetch;
}

interface CookieRecord {
  name: string;
  value: string;
}

interface CookieToSet extends CookieRecord {
  options?: Record<string, unknown>;
}

// --- In-memory cookie jar (stands in for the browser / Next cookie store) ----

class CookieJar {
  private cookies = new Map<string, string>();

  getAll(): CookieRecord[] {
    return [...this.cookies].map(([name, value]) => ({ name, value }));
  }

  set(name: string, value: string, options?: Record<string, unknown>): void {
    if (!value || options?.maxAge === 0) this.cookies.delete(name);
    else this.cookies.set(name, value);
  }

  setAll(cookies: CookieToSet[]): void {
    for (const { name, value, options } of cookies) this.set(name, value, options);
  }

  has(name: string): boolean {
    return this.cookies.has(name);
  }

  names(): string[] {
    return [...this.cookies.keys()].sort();
  }

  header(): string {
    return this.getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");
  }
}

/** Writes the PKCE verifier exactly as @supabase/ssr does for signInWithOtp. */
async function requestMagicLink(jar: CookieJar) {
  const client = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: { getAll: () => jar.getAll(), setAll: (c) => jar.setAll(c) },
  });
  const { error } = await client.auth.signInWithOtp({ email: "tester@example.com" });
  assert.equal(error, null);
  assert.ok(jar.has(VERIFIER), "verifier cookie written");
  assert.ok(auth.lastChallenge, "challenge sent to Supabase");
}

/** A leftover session cookie from an earlier sign-in that is no longer valid. */
function addStaleSession(jar: CookieJar, { expired }: { expired: boolean }) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = expired ? now - 60 : now + 3600;
  const session = {
    access_token: fakeJwt("revoked-session", expiresAt),
    refresh_token: "revoked-refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expiresAt,
    user: { id: "old-user", aud: "authenticated", email: "old@example.com" },
  };
  jar.set(STORAGE_KEY, `base64-${b64url(JSON.stringify(session))}`);
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON_KEY;
  installFakeAuth();
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

// --- Unit tests -------------------------------------------------------------

describe("auth cookie names", () => {
  it("derives supabase-js's default storage key", () => {
    assert.equal(supabaseAuthStorageKey(SUPABASE_URL), STORAGE_KEY);
  });

  it("treats the session cookie and its chunks as session cookies", () => {
    assert.ok(isSessionCookieName(STORAGE_KEY, STORAGE_KEY));
    assert.ok(isSessionCookieName(`${STORAGE_KEY}.0`, STORAGE_KEY));
    assert.ok(isSessionCookieName(`${STORAGE_KEY}.12`, STORAGE_KEY));
  });

  it("never treats the PKCE verifier or unrelated cookies as session cookies", () => {
    assert.equal(isSessionCookieName(VERIFIER, STORAGE_KEY), false);
    assert.equal(isSessionCookieName(`${STORAGE_KEY}.x`, STORAGE_KEY), false);
    assert.equal(isSessionCookieName("gcal_oauth_state", STORAGE_KEY), false);
  });

  it("reports which auth cookies were present, as booleans only", () => {
    assert.deepEqual(describeAuthCookies([VERIFIER, "other"], STORAGE_KEY), {
      hadCodeVerifierCookie: true,
      hadSessionCookie: false,
    });
    assert.deepEqual(describeAuthCookies([`${STORAGE_KEY}.0`], STORAGE_KEY), {
      hadCodeVerifierCookie: false,
      hadSessionCookie: true,
    });
  });
});

describe("redirect helpers", () => {
  it("builds the callback URL without a query string", () => {
    assert.equal(
      authCallbackUrl("http://localhost:3000"),
      "http://localhost:3000/auth/callback",
    );
  });

  it("only allows same-origin `next` paths", () => {
    assert.equal(safeNextPath(null), "/");
    assert.equal(safeNextPath("/"), "/");
    assert.equal(safeNextPath("/settings?tab=1"), "/settings?tab=1");
    assert.equal(safeNextPath("https://evil.example"), "/");
    assert.equal(safeNextPath("//evil.example"), "/");
    assert.equal(safeNextPath("/\\evil.example"), "/");
  });
});

describe("completeAuthUrlOncePerPageLoad", () => {
  it("completes auth params once per page load without keeping the URL", async () => {
    // Keyless by design: nothing derived from the landing URL (which may hold
    // a one-time code or bearer tokens) is stored for the page's lifetime.
    assert.equal(completeAuthUrlOncePerPageLoad.length, 1, "takes only the task, no key");

    const landingUrl = "http://localhost:3000/#access_token=fake-token&refresh_token=fake-refresh";
    let runs = 0;
    const task = async () => {
      runs += 1;
      void landingUrl; // the task may close over the URL while it runs
    };
    // Strict Mode: the effect runs twice; both share one attempt.
    const first = completeAuthUrlOncePerPageLoad(task);
    const second = completeAuthUrlOncePerPageLoad(task);
    assert.equal(first, second);
    assert.equal(await second, undefined, "the shared attempt resolves to nothing");
    assert.equal(runs, 1);

    await completeAuthUrlOncePerPageLoad(task);
    assert.equal(runs, 1, "never re-runs within the same page load");
  });
});

describe("browser client", () => {
  it("leaves auth params in the URL to AuthSessionHandler only", () => {
    const client = createBrowserClientFromConfig({ url: SUPABASE_URL, anonKey: ANON_KEY });
    const internals = client.auth as unknown as { detectSessionInUrl: unknown };
    assert.equal(internals.detectSessionInUrl, false);
  });
});

// --- Integration: code exchange in /auth/callback ---------------------------

/** The client /auth/callback uses (createServerSupabaseClient) over a jar. */
function serverClient(jar: CookieJar) {
  return createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: { getAll: () => jar.getAll(), setAll: (c) => jar.setAll(c) },
  });
}

function storedSessionText(jar: CookieJar): string {
  const cookie = jar.getAll().find((c) => isSessionCookieName(c.name, STORAGE_KEY));
  return cookie
    ? Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString()
    : "";
}

describe("callback code exchange", () => {
  it("reproduces the bug: validating a revoked session first deletes the verifier", async () => {
    // What the middleware used to do on /auth/callback before the route ran.
    // Characterises the auth-js behaviour the fix avoids: its sign-out
    // cleanup also removes the PKCE code verifier.
    const jar = new CookieJar();
    await requestMagicLink(jar);
    addStaleSession(jar, { expired: false });

    await serverClient(jar).auth.getUser();
    assert.equal(jar.has(VERIFIER), false, "verifier deleted by sign-out cleanup");

    const { error } = await serverClient(jar).auth.exchangeCodeForSession("good-code");
    assert.match(error?.message ?? "", /PKCE code verifier not found/);
    assert.ok(!auth.calls.includes("POST /auth/v1/token?pkce"), "exchange never reached Supabase");
  });

  for (const expired of [false, true]) {
    it(`signs in and replaces a stale ${expired ? "expired" : "revoked"} session`, async () => {
      const jar = new CookieJar();
      await requestMagicLink(jar);
      addStaleSession(jar, { expired });

      const { data, error } = await serverClient(jar).auth.exchangeCodeForSession("good-code");

      assert.equal(error, null);
      assert.equal(data.session?.access_token, freshSession().access_token);
      assert.equal(jar.has(VERIFIER), false, "verifier consumed");
      assert.match(storedSessionText(jar), /new-session|new-refresh/);
      assert.doesNotMatch(storedSessionText(jar), /revoked/);
    });
  }

  it("leaves an existing session untouched when the exchange fails", async () => {
    const jar = new CookieJar();
    await requestMagicLink(jar);
    addStaleSession(jar, { expired: false });
    const before = storedSessionText(jar);

    const { error } = await serverClient(jar).auth.exchangeCodeForSession("wrong-code");

    assert.ok(error);
    assert.equal(storedSessionText(jar), before);
  });
});

// --- Integration: middleware ------------------------------------------------

describe("middleware (updateSession)", () => {
  it("does not touch auth cookies on /auth/callback", async () => {
    const jar = new CookieJar();
    await requestMagicLink(jar);
    addStaleSession(jar, { expired: false });
    auth.calls = [];

    const request = new NextRequest("http://localhost:3000/auth/callback?code=good-code", {
      headers: { cookie: jar.header() },
    });
    const response = await updateSession(request);

    assert.deepEqual(auth.calls, [], "no getUser/refresh on the callback");
    assert.ok(request.cookies.get(VERIFIER)?.value, "verifier still on the request");
    assert.equal(response.headers.get("set-cookie"), null);
  });

  it("still signs out a revoked session on other routes (unchanged)", async () => {
    const jar = new CookieJar();
    addStaleSession(jar, { expired: false });

    const request = new NextRequest("http://localhost:3000/", {
      headers: { cookie: jar.header() },
    });
    const response = await updateSession(request);

    assert.ok(auth.calls.includes("GET /auth/v1/user"));
    assert.match(response.headers.get("set-cookie") ?? "", new RegExp(`${STORAGE_KEY}=;`));
  });

  it("forwards ?code= to /auth/callback before touching a stale session", async () => {
    // A link landing on `/?code=` (e.g. Supabase falling back to the Site URL)
    // while the browser holds a revoked session: the verifier must survive
    // the hop to the callback, and the callback must then sign in.
    const jar = new CookieJar();
    await requestMagicLink(jar);
    addStaleSession(jar, { expired: false });
    auth.calls = [];

    const request = new NextRequest("http://localhost:3000/?code=good-code", {
      headers: { cookie: jar.header() },
    });
    const response = await updateSession(request);

    assert.deepEqual(auth.calls, [], "no getUser/refresh before the redirect");
    assert.equal(response.headers.get("set-cookie"), null, "no cookies changed");
    assert.ok(request.cookies.get(VERIFIER)?.value, "verifier still on the request");
    const location = new URL(response.headers.get("location") ?? "");
    assert.equal(location.pathname, "/auth/callback");
    assert.equal(location.searchParams.get("code"), "good-code");

    const callback = new NextRequest(location, { headers: { cookie: jar.header() } });
    assert.equal((await updateSession(callback)).headers.get("set-cookie"), null);
    const { error } = await serverClient(jar).auth.exchangeCodeForSession("good-code");
    assert.equal(error, null, "callback exchange succeeds with the verifier");
  });

  it("forwards ?code= without a session too (unchanged)", async () => {
    const request = new NextRequest("http://localhost:3000/?code=good-code");
    const response = await updateSession(request);
    const location = new URL(response.headers.get("location") ?? "");
    assert.equal(location.pathname, "/auth/callback");
    assert.equal(location.searchParams.get("code"), "good-code");
  });

  it("leaves the Google Calendar OAuth callback alone (unchanged)", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/google-calendar/callback?code=g&state=s",
    );
    const response = await updateSession(request);
    assert.equal(response.headers.get("location"), null);
  });
});
