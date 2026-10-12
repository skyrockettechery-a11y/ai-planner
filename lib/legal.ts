/**
 * Owner-controlled values for the public /about, /privacy and /terms pages
 * (Task Card M11-PUBLIC-PAGES-01).
 *
 * Owner-approved: public brand "AI Planner" only (no personal or company
 * name; not presented as a registered legal entity) and the public contact
 * email below. The effective date is the actual publication date, so it stays
 * null until the owner publishes; while null the pages show a visible "to be
 * set" marker. Set `LEGAL_DOCS_DRAFT` to false only after the owner has
 * approved the final wording.
 */

/** Shows the "draft — pending owner review" notice on Privacy and Terms. */
export const LEGAL_DOCS_DRAFT = true;

/** Public contact for support, privacy and account/data deletion requests. */
export const LEGAL_CONTACT_EMAIL = "aiplanner.support@gmail.com";

/** Effective date shown on Privacy and Terms: the actual publication date. */
export const LEGAL_EFFECTIVE_DATE: string | null = null;

export const GOOGLE_CALENDAR_FREEBUSY_SCOPE_URL =
  "https://www.googleapis.com/auth/calendar.freebusy";

export const GOOGLE_API_USER_DATA_POLICY_URL =
  "https://developers.google.com/terms/api-services-user-data-policy";

export const GOOGLE_ACCOUNT_PERMISSIONS_URL =
  "https://myaccount.google.com/permissions";
