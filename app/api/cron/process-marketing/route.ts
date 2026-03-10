import { NextResponse } from 'next/server'
import { processMarketingQueue } from '@/app/actions/marketing-actions'

/**
 * Cron: processar marketing-kön (Mail 1–3-sekvensen).
 * Kräver CRON_SECRET i Authorization: Bearer <secret> eller header x-cron-secret.
 * Schemalägg med Vercel Cron (t.ex. en gång per dygn).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const secretHeader = request.headers.get('x-cron-secret')
  const secret = process.env.CRON_SECRET || ''

  if (!secret) {
    return NextResponse.json(
      { error: 'Cron secret not configured.' },
      { status: 500 }
    )
  }

  const provided =
    (authHeader?.startsWith('Bearer ') && authHeader.slice(7)) || secretHeader
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const result = await processMarketingQueue()

    console.log('[cron/process-marketing]', {
      success: result.success,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
      errorCount: result.errors.length,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })

    return NextResponse.json({
      ok: result.success,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[cron/process-marketing] Error:', err)
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
