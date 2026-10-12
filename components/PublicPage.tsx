import type { ReactNode } from "react";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_DOCS_DRAFT,
  LEGAL_EFFECTIVE_DATE,
} from "@/lib/legal";

/** Visible marker for a value the project owner still has to supply. */
export function OwnerPending({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900">
      {children}
    </span>
  );
}

export function DocumentHeader({ title, intro }: { title: string; intro: string }) {
  return (
    <header className="space-y-3 border-b border-zinc-200 pb-6">
      {LEGAL_DOCS_DRAFT && (
        <p
          role="note"
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          Draft — pending owner review. This document has not yet been approved
          for publication.
        </p>
      )}
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{title}</h1>
      <p className="text-sm text-zinc-500">
        Effective date:{" "}
        {LEGAL_EFFECTIVE_DATE ?? <OwnerPending>to be set on publication</OwnerPending>}
      </p>
      <p className="text-base leading-7 text-zinc-700">{intro}</p>
    </header>
  );
}

export function DocumentSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="scroll-mt-6 text-xl font-semibold text-zinc-900">
        {title}
      </h2>
      <div className="space-y-3 text-base leading-7 text-zinc-700">{children}</div>
    </section>
  );
}

export function BulletList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 marker:text-zinc-400">{children}</ul>;
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
    >
      {children}
    </a>
  );
}

export function ContactEmail() {
  if (!LEGAL_CONTACT_EMAIL) {
    return <OwnerPending>contact email to be provided by the owner</OwnerPending>;
  }
  return (
    <a
      href={`mailto:${LEGAL_CONTACT_EMAIL}`}
      className="font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
    >
      {LEGAL_CONTACT_EMAIL}
    </a>
  );
}
