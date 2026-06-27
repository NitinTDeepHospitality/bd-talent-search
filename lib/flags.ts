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
