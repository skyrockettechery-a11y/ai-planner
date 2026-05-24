"use client";

import { FormEvent, useState } from "react";
import {
  SUPABASE_ANON_KEY_ENV,
  SUPABASE_URL_ENV,
  type SupabaseConfigDiagnostic,
} from "@/lib/supabase/config";

interface AuthBarProps {
  configured: boolean;
  loading: boolean;
  email: string | null;
  devDiagnostic?: SupabaseConfigDiagnostic | null;
  onGoogleSignIn: () => void;
  onEmailSignIn: (email: string) => Promise<{ error: string | null }>;
  onSignOut: () => void;
}

export function AuthBar({
  configured,
  loading,
  email,
  devDiagnostic,
  onGoogleSignIn,
  onEmailSignIn,
  onSignOut,
}: AuthBarProps) {
  const [showEmail, setShowEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  if (!configured) {
    return (
      <div className="space-y-1 text-xs text-zinc-500">
        <p>
          Cloud sync unavailable. Add{" "}
          <span className="font-medium text-zinc-700">{SUPABASE_URL_ENV}</span> and{" "}
          <span className="font-medium text-zinc-700">{SUPABASE_ANON_KEY_ENV}</span>{" "}
          to Vercel <span className="font-medium text-zinc-700">Production</span>{" "}
          environment variables, then redeploy.
        </p>
        <p>Using local storage only until then.</p>
        {process.env.NODE_ENV === "development" &&
          devDiagnostic &&
          devDiagnostic.missing.length > 0 && (
            <p className="text-amber-700">
              Dev diagnostic — missing: {devDiagnostic.missing.join(", ")} (check
              .env.local)
            </p>
          )}
      </div>
    );
  }

  if (loading) {
    return <p className="text-xs text-zinc-500">Checking sign-in…</p>;
  }

  if (email) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2">
        <p className="truncate text-xs text-zinc-600">
          Synced as <span className="font-medium text-zinc-900">{email}</span>
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Sign out
        </button>
      </div>
    );
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = emailInput.trim();
    if (!trimmed) return;
    setMessage(null);
    const result = await onEmailSignIn(trimmed);
    if (result.error) {
      setMessage(result.error);
    } else {
      setMessage("Check your email for the sign-in link.");
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5">
      <p className="text-xs text-zinc-600">
        Sign in to sync tasks across phone and desktop.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onGoogleSignIn}
          className="min-h-9 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
        >
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => setShowEmail((value) => !value)}
          className="min-h-9 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Email link
        </button>
      </div>

      {showEmail && (
        <form onSubmit={handleEmailSubmit} className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="you@example.com"
            required
            className="min-h-9 flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          />
          <button
            type="submit"
            className="min-h-9 shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Send link
          </button>
        </form>
      )}

      {message && <p className="mt-2 text-xs text-zinc-600">{message}</p>}
    </div>
  );
}
