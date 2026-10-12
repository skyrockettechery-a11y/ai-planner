import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";

/**
 * Shell for public pages (/about, /privacy, /terms). These pages are static
 * and never read the Supabase session, so they render for signed-out
 * visitors and for Google's OAuth branding review.
 */
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/about" className="text-base font-semibold tracking-tight text-zinc-900">
            AI Planner
          </Link>
          <PublicNav />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-6 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>AI Planner</p>
          <nav aria-label="Footer" className="flex flex-wrap gap-4">
            <Link href="/about" className="hover:text-zinc-900">
              About
            </Link>
            <Link href="/privacy" className="hover:text-zinc-900">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-zinc-900">
              Terms of Service
            </Link>
            <Link href="/" className="hover:text-zinc-900">
              Open app
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
