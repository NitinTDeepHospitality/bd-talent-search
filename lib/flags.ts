// Feature flags. Tiny, file-scoped, no env-var ceremony — flip the
// constant, commit, deploy.

/**
 * Phase 4 Outlook follow-up scheduling. When true, candidate + client
 * detail screens show "Schedule follow-up" buttons that create real
 * Outlook events via Microsoft Graph. Requires Belinda to sign in with
 * Microsoft on her first visit so we have a token with
 * Calendars.ReadWrite scope.
 */
export const OUTLOOK_ENABLED = true;

/**
 * Email allow-list. Once a user signs in via Microsoft, the middleware
 * checks their email against this set; if not present they're signed
 * back out and redirected to /login with a not_authorized error. Keeps
 * the multi-tenant Azure app safe from random Microsoft 365 users
 * stumbling onto the URL.
 *
 * Match is case-insensitive — values here are lower-cased for the
 * comparison and the user's email is too.
 *
 * To add someone: drop their address in, commit, push (~90s deploy).
 */
export const ALLOWED_EMAILS: ReadonlySet<string> = new Set(
  [
    'belinda@bdtalentsearch.com',
    'nitin.thariyan@deep-hospitality.com',
    'nitin.thariyan@leanondata.com',
    'ritta.sachin@leanondata.com',
  ].map((e) => e.toLowerCase()),
);

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.has(email.trim().toLowerCase());
}
