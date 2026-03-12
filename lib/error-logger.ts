export async function logErrorToDashboard(error: Error, path?: string) {
  try {
    const href =
      typeof window !== 'undefined' ? window.location.pathname : undefined

    const payload = {
      error_message: String(error?.message || error?.toString?.() || 'Okänt fel'),
      stack_trace: error?.stack || null,
      path: path || href || null,
      user_id: null as string | null, // Kan utökas senare med aktiv user-id via API
    }

    await fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Svälj nätverksfel – loggning får aldrig störa användaren
    })
  } catch {
    // Svälj helt – detta är bara ett hjälpmedel, inte kritisk logik
  }
}

