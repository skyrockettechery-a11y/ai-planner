import type { Metadata } from "next";
import Link from "next/link";
import {
  BulletList,
  ContactEmail,
  DocumentHeader,
  DocumentSection,
  ExternalLink,
  OwnerPending,
} from "@/components/PublicPage";
import {
  GOOGLE_ACCOUNT_PERMISSIONS_URL,
  GOOGLE_API_USER_DATA_POLICY_URL,
  GOOGLE_CALENDAR_FREEBUSY_SCOPE_URL,
  LEGAL_OPERATOR_NAME,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy · AI Planner",
  description:
    "How AI Planner handles your account, task data and optional Google Calendar free/busy availability.",
};

const CONTENTS = [
  { id: "information", label: "Information AI Planner handles" },
  { id: "use", label: "How we use information" },
  { id: "google-calendar", label: "Google Calendar availability" },
  { id: "disconnect", label: "Disconnecting Google Calendar" },
  { id: "providers", label: "Service providers" },
  { id: "sharing", label: "Sharing" },
  { id: "retention", label: "Retention and deletion" },
  { id: "security", label: "Security" },
  { id: "choices", label: "Your choices" },
  { id: "contact", label: "Contact" },
  { id: "changes", label: "Changes to this policy" },
] as const;

export default function PrivacyPage() {
  return (
    <article className="space-y-10">
      <DocumentHeader
        title="Privacy Policy"
        intro="This policy explains what information AI Planner handles, why, where it is stored, and the choices you have — including for the optional Google Calendar availability feature."
      />

      <nav aria-label="On this page" className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          On this page
        </h2>
        <ol className="mt-3 grid list-decimal gap-1.5 pl-5 text-sm text-zinc-700 sm:grid-cols-2">
          {CONTENTS.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`} className="hover:text-zinc-900 hover:underline">
                {item.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <DocumentSection id="who" title="Who we are">
        <p>
          AI Planner (“AI Planner”, “we”, “us”) is a small, independently
          operated task-planning web application available at
          ai-planner-taupe.vercel.app. It is operated by{" "}
          {LEGAL_OPERATOR_NAME ?? (
            <OwnerPending>operator name to be provided by the owner</OwnerPending>
          )}
          . You can reach us about privacy at <ContactEmail />.
        </p>
      </DocumentSection>

      <DocumentSection id="information" title="1. Information AI Planner handles">
        <h3 className="font-semibold text-zinc-900">Using AI Planner without signing in</h3>
        <p>
          You can use AI Planner without an account. Your tasks and planning
          preferences are then stored only in your browser’s local storage on
          that device. They are not sent to our database.
        </p>

        <h3 className="font-semibold text-zinc-900">Account information</h3>
        <p>
          If you sign in to sync your tasks, sign-in is handled by Supabase
          Auth, either with an email sign-in link or with Google Sign-In.
          Supabase Auth processes your email address and, if you use Google
          Sign-In, the basic profile information Google shares for sign-in
          (such as your name and profile picture). AI Planner uses your email
          address to identify your account and to show which account you are
          signed in with. Supabase sets cookies in your browser to keep you
          signed in.
        </p>

        <h3 className="font-semibold text-zinc-900">Task and planning data</h3>
        <p>When you are signed in, AI Planner stores the following in its Supabase database, linked to your account:</p>
        <BulletList>
          <li>
            Tasks: title, notes, due date, priority quadrant, completion status,
            and when the task was created and last updated.
          </li>
          <li>
            Planning preferences: the task you marked as “Doing Now”, your
            Today’s Plan recommendation mode, suggestions you dismissed, and
            whether Today’s Plan is hidden.
          </li>
        </BulletList>
        <p>
          A copy of your tasks and preferences is also kept in your browser’s
          local storage on each device you use, so the app works quickly.
        </p>

        <h3 className="font-semibold text-zinc-900">Google Calendar connection (optional)</h3>
        <p>
          If you connect Google Calendar, AI Planner handles limited calendar
          availability information and an authorization token, as described in{" "}
          <a href="#google-calendar" className="font-medium text-zinc-900 underline underline-offset-2">
            section 3
          </a>
          .
        </p>

        <h3 className="font-semibold text-zinc-900">Technical information</h3>
        <p>
          Like most websites, our hosting and database providers process
          standard technical information when your browser makes a request,
          such as your IP address, browser type, the page or address requested,
          and the time of the request. AI Planner does not use analytics,
          advertising or third-party tracking tools.
        </p>
      </DocumentSection>

      <DocumentSection id="use" title="2. How we use information">
        <BulletList>
          <li>To provide the app: show, save and sync your tasks and preferences.</li>
          <li>To sign you in and keep your data associated with your account.</li>
          <li>
            If you connect Google Calendar, to show you when you are busy so you
            can plan your tasks.
          </li>
          <li>To keep the service working, secure and to diagnose problems.</li>
        </BulletList>
        <p>
          Task prioritization suggestions are made inside AI Planner using
          simple keyword rules. Your tasks are not sent to a third-party AI
          service.
        </p>
      </DocumentSection>

      <DocumentSection id="google-calendar" title="3. Google Calendar availability">
        <p>
          Google Calendar availability is an optional feature that is being
          introduced and may not yet be available to every user. This section
          applies when it is available to you and you choose to connect it.
        </p>

        <h3 className="font-semibold text-zinc-900">Separate authorization</h3>
        <p>
          Connecting Google Calendar is separate from signing in. Even if you
          signed in with Google, AI Planner asks for calendar permission
          separately, and only when you choose “Connect Google Calendar”. You
          must be signed in to AI Planner to connect.
        </p>

        <h3 className="font-semibold text-zinc-900">Permission requested</h3>
        <p>AI Planner requests a single Google permission (OAuth scope):</p>
        <p className="break-all rounded-lg bg-zinc-100 px-3 py-2 font-mono text-sm text-zinc-800">
          {GOOGLE_CALENDAR_FREEBUSY_SCOPE_URL}
        </p>
        <p>
          This permission lets AI Planner see when you are busy. It does not
          give access to event titles, descriptions, locations or attendees,
          and it does not allow creating, changing or deleting events.
        </p>

        <h3 className="font-semibold text-zinc-900">What information is retrieved</h3>
        <BulletList>
          <li>
            Only the start and end times of busy periods on your{" "}
            <strong className="font-semibold text-zinc-900">primary</strong>{" "}
            Google Calendar.
          </li>
          <li>
            Only for the time range you choose in the app (Today, Tomorrow, or
            the next 7 days).
          </li>
          <li>Other calendars in your Google Account are not checked.</li>
        </BulletList>

        <h3 className="font-semibold text-zinc-900">How it is used</h3>
        <p>
          Busy times are shown to you in AI Planner so you can plan your tasks
          around your schedule. They are shown only to you. AI Planner does not
          turn calendar events into tasks.
        </p>

        <h3 className="font-semibold text-zinc-900">Storage, caching and logging</h3>
        <BulletList>
          <li>
            Busy times are requested from Google when you view your
            availability, sent to your browser and displayed. They are not
            saved in our database, not cached by our server (responses are
            marked not to be stored), and not written to your browser’s local
            storage.
          </li>
          <li>
            Our server logs record only error status codes and Google error
            codes for this feature — not busy times or tokens. Our hosting
            provider’s request logs may include the date range you asked to
            view, because it is part of the request address.
          </li>
        </BulletList>

        <h3 className="font-semibold text-zinc-900">Tokens</h3>
        <BulletList>
          <li>
            When you connect, Google issues a refresh token so AI Planner can
            check your availability later without asking you to connect again.
            The refresh token is encrypted with AES-256-GCM on our server before
            it is stored in our Supabase database, together with the permission
            granted and the time you connected.
          </li>
          <li>
            This stored connection cannot be read from the browser. Only AI
            Planner’s server can access it, and only for the signed-in account
            it belongs to. The encryption key is kept as a server-side secret,
            separate from the database.
          </li>
          <li>
            Short-lived Google access tokens are obtained from Google for each
            availability request and are not intentionally stored persistently.
          </li>
          <li>
            While you are connecting, a short-lived (10-minute), encrypted,
            HTTP-only cookie holds temporary security values for the
            authorization step. It is cleared when the connection completes.
          </li>
        </BulletList>

        <h3 className="font-semibold text-zinc-900">Google API Services User Data Policy</h3>
        <p>
          AI Planner’s use and transfer of information received from Google
          APIs will adhere to the{" "}
          <ExternalLink href={GOOGLE_API_USER_DATA_POLICY_URL}>
            Google API Services User Data Policy
          </ExternalLink>
          , including the Limited Use requirements. Google user data is used
          only to provide the availability feature described above. It is not
          sold, not used for advertising, not used to train AI or machine
          learning models, and not read by people except with your consent,
          for security purposes, or where required by law.
        </p>
      </DocumentSection>

      <DocumentSection id="disconnect" title="4. Disconnecting Google Calendar">
        <BulletList>
          <li>
            <strong className="font-semibold text-zinc-900">In AI Planner:</strong>{" "}
            choose “Disconnect” on the Google Calendar card. AI Planner asks
            Google to revoke its access and deletes the stored connection.
          </li>
          <li>
            <strong className="font-semibold text-zinc-900">In your Google Account:</strong>{" "}
            remove AI Planner at{" "}
            <ExternalLink href={GOOGLE_ACCOUNT_PERMISSIONS_URL}>
              myaccount.google.com/permissions
            </ExternalLink>
            . The next time AI Planner tries to check your availability, Google
            refuses the request and AI Planner deletes the stored connection.
          </li>
        </BulletList>
        <p>
          Disconnecting deletes the stored connection: the encrypted refresh
          token, the permission granted and the connection time. Because busy
          times are not stored, there is no calendar information left to
          delete. Disconnecting does not affect your AI Planner account or
          tasks.
        </p>
      </DocumentSection>

      <DocumentSection id="providers" title="5. Service providers">
        <p>AI Planner relies on these providers to operate:</p>
        <BulletList>
          <li>
            <strong className="font-semibold text-zinc-900">Vercel</strong> — hosts
            the website and runs AI Planner’s server code.
          </li>
          <li>
            <strong className="font-semibold text-zinc-900">Supabase</strong> —
            provides sign-in (Supabase Auth) and the database that stores
            account, task and preference data and the encrypted Google Calendar
            connection.
          </li>
          <li>
            <strong className="font-semibold text-zinc-900">Google</strong> —
            provides Google Sign-In (if you use it) and the Google Calendar
            free/busy service (if you connect it).
          </li>
        </BulletList>
        <p>
          These providers process information on our behalf to run the service
          and handle it under their own terms and privacy policies.
        </p>
      </DocumentSection>

      <DocumentSection id="sharing" title="6. Sharing">
        <p>
          We do not sell your information and do not share it for advertising.
          We share information only with the service providers listed above as
          needed to run AI Planner, or where required by law.
        </p>
      </DocumentSection>

      <DocumentSection id="retention" title="7. Retention and deletion">
        <BulletList>
          <li>
            Tasks and preferences remain in our database until you delete them.
            Deleting a task in the app while signed in removes it from the
            database when the app syncs.
          </li>
          <li>
            Signing out does not delete your synced data. The copy in your
            browser’s local storage remains on that device until you clear the
            site’s data in your browser.
          </li>
          <li>
            The Google Calendar connection is kept until you disconnect it, you
            revoke access at Google, or Google reports that access has expired
            or been revoked.
          </li>
          <li>
            AI Planner does not currently offer in-app account deletion. To ask
            for your account and its associated data to be deleted, contact us
            at <ContactEmail />.
          </li>
        </BulletList>
      </DocumentSection>

      <DocumentSection id="security" title="8. Security">
        <p>
          AI Planner is served over HTTPS. Database access rules ensure a
          signed-in user can read and change only their own tasks and
          preferences, and the Google Calendar connection table is not
          accessible from the browser at all. Google refresh tokens are
          encrypted before storage. No method of storage or transmission is
          completely secure, but we work to protect your information.
        </p>
      </DocumentSection>

      <DocumentSection id="choices" title="9. Your choices">
        <BulletList>
          <li>Use AI Planner without an account, keeping tasks only in your browser.</li>
          <li>Edit or delete your tasks at any time.</li>
          <li>Choose whether to connect Google Calendar, and disconnect it at any time.</li>
          <li>Revoke AI Planner’s Google access in your Google Account.</li>
          <li>Contact us with privacy questions or requests.</li>
        </BulletList>
      </DocumentSection>

      <DocumentSection id="contact" title="10. Contact">
        <p>
          For privacy questions or requests, contact us at <ContactEmail />.
        </p>
      </DocumentSection>

      <DocumentSection id="changes" title="11. Changes to this policy">
        <p>
          We may update this policy as AI Planner changes. We will post the
          updated policy on this page and update the effective date. If we
          change how AI Planner uses Google user data, we will update this
          policy before the change takes effect and ask for your consent again
          where required.
        </p>
        <p>
          See also the{" "}
          <Link
            href="/terms"
            className="font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
          >
            Terms of Service
          </Link>
          .
        </p>
      </DocumentSection>
    </article>
  );
}
