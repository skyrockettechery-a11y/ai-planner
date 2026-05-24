import { PlannerApp } from "@/components/PlannerApp";
import { SupabaseConfigProvider } from "@/components/SupabaseConfigProvider";
import {
  getSupabaseConfigDiagnostic,
  getSupabasePublicConfig,
} from "@/lib/supabase/config";

/** Read Supabase env at request time on Vercel (not only at build time). */
export const dynamic = "force-dynamic";

export default function Home() {
  const supabaseConfig = getSupabasePublicConfig();
  const devDiagnostic =
    process.env.NODE_ENV === "development"
      ? getSupabaseConfigDiagnostic()
      : null;

  return (
    <main className="min-h-full flex-1 bg-zinc-50">
      <SupabaseConfigProvider config={supabaseConfig}>
        <PlannerApp devSupabaseDiagnostic={devDiagnostic} />
      </SupabaseConfigProvider>
    </main>
  );
}
