import Link from "next/link";
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
      <footer className="mx-auto w-full max-w-5xl px-4 pb-6 sm:px-6">
        <nav
          aria-label="About and legal"
          className="flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-200 pt-4 text-xs text-zinc-500"
        >
          <Link href="/about" className="hover:text-zinc-900">
            About
          </Link>
          <Link href="/privacy" className="hover:text-zinc-900">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-zinc-900">
            Terms of Service
          </Link>
        </nav>
      </footer>
    </main>
  );
}
