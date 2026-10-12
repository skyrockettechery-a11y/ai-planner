import type { Metadata } from "next";
import Link from "next/link";
import { QUADRANT_META, QUADRANTS } from "@/lib/quadrants";

export const metadata: Metadata = {
  title: "About AI Planner",
  description:
    "AI Planner helps you capture tasks, prioritize them with the Eisenhower Matrix, plan your day and keep tasks in sync across devices.",
};

const FEATURES = [
  {
    title: "Capture tasks quickly",
    body: "Add a task in a single step, then edit notes and due dates, mark it complete or restore it later.",
  },
  {
    title: "Prioritize with the Eisenhower Matrix",
    body: "Each task is suggested into one of the four quadrants below using simple keyword rules. You can always move a task yourself.",
    quadrants: true,
  },
  {
    title: "Plan and track your day",
    body: "Today's Plan suggests what to work on next, Doing Now keeps one task in focus, and the daily overview shows how many tasks you have completed.",
  },
  {
    title: "Sync across devices",
    body: "Use AI Planner without an account, with tasks kept in your browser, or sign in to sync tasks between your phone and desktop through a Supabase-backed database.",
  },
] as const;

const CALENDAR_FACTS = [
  "Connected separately from signing in, only if you choose to authorize it.",
  "Read-only free/busy access: AI Planner sees only the start and end times of busy periods.",
  "Checks your primary Google Calendar only.",
  "Never creates, modifies or deletes Google Calendar events.",
  "Does not read event titles, descriptions or attendees.",
  "Can be disconnected from AI Planner, or revoked in your Google Account, at any time.",
] as const;

export default function AboutPage() {
  return (
    <article className="space-y-12">
      <header className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          About
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          AI Planner
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-zinc-700">
          AI Planner is a calm, capture-first task planner for individuals who
          want a quick way to write down what needs doing, decide what matters
          most, and stay focused on today.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/"
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Open AI Planner
          </Link>
          <Link
            href="/privacy"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Privacy Policy
          </Link>
        </div>
      </header>

      <section aria-labelledby="features" className="space-y-4">
        <h2 id="features" className="text-xl font-semibold text-zinc-900">
          What AI Planner does
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5"
            >
              <h3 className="text-base font-semibold text-zinc-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{feature.body}</p>
              {"quadrants" in feature && (
                <ol className="mt-3 grid gap-1.5 text-sm text-zinc-700">
                  {QUADRANTS.map((quadrant) => (
                    <li key={quadrant} className="rounded-md bg-zinc-50 px-2.5 py-1.5">
                      <span className="font-medium text-zinc-900">
                        {QUADRANT_META[quadrant].label}
                      </span>{" "}
                      — {QUADRANT_META[quadrant].shortLabel}
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="google-calendar"
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 sm:p-6"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="google-calendar" className="text-xl font-semibold text-zinc-900">
            Google Calendar availability
          </h2>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
            Being introduced
          </span>
        </div>
        <p className="text-base leading-7 text-zinc-700">
          We are introducing an optional Google Calendar connection that shows
          when you are busy, so you can plan tasks around your schedule. It may
          not yet be available to every user. When it is available:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-base leading-7 text-zinc-700 marker:text-zinc-400">
          {CALENDAR_FACTS.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
        <p className="text-sm leading-6 text-zinc-600">
          Details about the permission requested and how tokens are stored are in
          the{" "}
          <Link
            href="/privacy#google-calendar"
            className="font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="more" className="space-y-3">
        <h2 id="more" className="text-xl font-semibold text-zinc-900">
          Policies
        </h2>
        <p className="text-base leading-7 text-zinc-700">
          Read the{" "}
          <Link
            href="/privacy"
            className="font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
          >
            Privacy Policy
          </Link>{" "}
          to learn what information AI Planner handles, and the{" "}
          <Link
            href="/terms"
            className="font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
          >
            Terms of Service
          </Link>{" "}
          for the conditions of using the app.
        </p>
      </section>
    </article>
  );
}
