/**
 * Owner-controlled values for the public /about, /privacy and /terms pages
 * (Task Card M11-PUBLIC-PAGES-01).
 *
 * These are intentionally left unset: the operator name, contact email and
 * effective date must come from the project owner, not from an agent. While a
 * value is null the pages show a visible "to be provided" marker instead of
 * inventing one. Set `LEGAL_DOCS_DRAFT` to false only after the owner has
 * approved the final wording.
 */

/** Shows the "draft — pending owner review" notice on Privacy and Terms. */
export const LEGAL_DOCS_DRAFT = true;

/** Public privacy/support contact email, e.g. "privacy@example.com". */
export const LEGAL_CONTACT_EMAIL: string | null = null;

/** Name of the person or entity operating AI Planner, if it should be published. */
export const LEGAL_OPERATOR_NAME: string | null = null;

/** Effective date shown on Privacy and Terms, e.g. "1 November 2026". */
export const LEGAL_EFFECTIVE_DATE: string | null = null;

export const GOOGLE_CALENDAR_FREEBUSY_SCOPE_URL =
  "https://www.googleapis.com/auth/calendar.freebusy";

export const GOOGLE_API_USER_DATA_POLICY_URL =
  "https://developers.google.com/terms/api-services-user-data-policy";

export const GOOGLE_ACCOUNT_PERMISSIONS_URL =
  "https://myaccount.google.com/permissions";
