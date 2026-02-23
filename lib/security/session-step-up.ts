export const SENSITIVE_ACTION_REAUTH_WINDOW_MS = 15 * 60 * 1000

export function hasRecentSignIn(
  lastSignInAt: string | null | undefined,
  windowMs: number = SENSITIVE_ACTION_REAUTH_WINDOW_MS
): boolean {
  if (!lastSignInAt) return false

  const lastSignInMs = Date.parse(lastSignInAt)
  if (Number.isNaN(lastSignInMs)) return false

  return Date.now() - lastSignInMs <= windowMs
}

export function buildReauthLoginUrl(nextPath: string): string {
  const params = new URLSearchParams({
    reason: 'reauth_required',
    next: nextPath,
  })
  return `/login?${params.toString()}`
}
