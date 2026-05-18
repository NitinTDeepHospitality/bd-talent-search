// Feature flags. Tiny, file-scoped, no env-var ceremony — flip the
// constant, commit, deploy.

/**
 * Phase 4 Outlook follow-up scheduling. When false, the "Schedule
 * follow-up" buttons on candidate + client detail screens are hidden
 * so Belinda can test the rest of the app without being forced into a
 * Microsoft sign-in. Flip to true once she's ready to sign in and use
 * the calendar feature.
 */
export const OUTLOOK_ENABLED = false;
