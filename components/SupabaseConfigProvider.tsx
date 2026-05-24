"use client";

import { createContext, useContext } from "react";
import type { SupabasePublicConfig } from "@/lib/supabase/config";

const SupabaseConfigContext = createContext<SupabasePublicConfig | null>(null);

export function SupabaseConfigProvider({
  config,
  children,
}: {
  config: SupabasePublicConfig | null;
  children: React.ReactNode;
}) {
  return (
    <SupabaseConfigContext.Provider value={config}>
      {children}
    </SupabaseConfigContext.Provider>
  );
}

export function useSupabasePublicConfig(): SupabasePublicConfig | null {
  return useContext(SupabaseConfigContext);
}
