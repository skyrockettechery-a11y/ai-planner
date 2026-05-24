"use client";

import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabasePublicConfig } from "@/components/SupabaseConfigProvider";
import { createBrowserClientFromConfig } from "@/lib/supabase/client";

export function useAuth() {
  const config = useSupabasePublicConfig();
  const configured = config !== null;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);
  const supabase = useMemo(
    () => (config ? createBrowserClientFromConfig(config) : null),
    [config],
  );

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    const redirectTo = `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }, [supabase]);

  const signInWithEmail = useCallback(
    async (email: string) => {
      if (!supabase) return { error: "Supabase is not configured" };
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      return { error: error?.message ?? null };
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, [supabase]);

  return {
    user,
    loading,
    configured,
    signInWithGoogle,
    signInWithEmail,
    signOut,
  };
}
