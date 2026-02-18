import { NextRequest, NextResponse } from 'next/server'
import { sendImportErrorNotification } from '@/lib/email/resend'

/**
 * Anropas av Supabase Database Webhook när import_logs får INSERT med status='error'.
 * Konfigurera webhook i Supabase: Table import_logs, Insert, URL: https://your-app/api/import-error-notify
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const payload = body?.record ?? body

    const userId = payload?.user_id ?? 'okänd'
    const errorMessage = payload?.error_message ?? 'Inget felmeddelande'
    const rowsProcessed = typeof payload?.rows_processed === 'number' ? payload.rows_processed : 0

    if (payload?.status !== 'error') {
      return NextResponse.json({ ok: true, skipped: 'not error status' })
    }

    const result = await sendImportErrorNotification({
      userId: String(userId),
      errorMessage: String(errorMessage),
      rowsProcessed,
    })

    if (!result.success) {
      console.error('[import-error-notify] Email failed:', result.error)
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[import-error-notify] Exception:', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
