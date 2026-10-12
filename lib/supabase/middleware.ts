import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasRecognizedAuthParams } from "@/lib/auth/parseAuthParams";
import { AUTH_CALLBACK_PATH } from "@/lib/auth/redirect";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export async function updateSession(request: NextRequest) {
  const config = getSupabasePublicConfig();
  let response = NextResponse.next({ request });

  if (!config) {
    return response;
  }

  const url = request.nextUrl;

  // The callback route establishes the session itself. Refreshing here first
  // can sign out a stale session cookie, and auth-js's sign-out cleanup also
  // deletes the PKCE code verifier the callback is about to exchange.
  if (url.pathname === AUTH_CALLBACK_PATH) {
    return response;
  }

  // Google Calendar OAuth (Mission 11) also returns `?code=`; it is not a
  // Supabase sign-in and must reach its own route handler untouched.
  const isGoogleCalendarRoute = url.pathname.startsWith("/api/google-calendar/");

  // Sign-in params landing on any other page go to the callback *before* the
  // session refresh below, for the same reason: a stale session must not be
  // signed out (taking the verifier with it) on the way to the callback.
  if (hasRecognizedAuthParams(url) && !isGoogleCalendarRoute) {
    const redirectUrl = url.clone();
    redirectUrl.pathname = AUTH_CALLBACK_PATH;
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}
