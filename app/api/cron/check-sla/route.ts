import { NextResponse } from 'next/server'
import { checkLeadSlaStatusForAllOrgs } from '@/lib/features/leados/leados-sla-check'

/**
 * Cron: kör SLA-check för alla organisationer.
 * Kräver CRON_SECRET i Authorization: Bearer <secret> eller header x-cron-secret.
 * T.ex. Vercel Cron: GET/POST /api/cron/check-sla med secret i env.
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
    const result = await checkLeadSlaStatusForAllOrgs()
    return NextResponse.json({
      ok: true,
      processed: result.processed,
      notified: result.notified,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[cron/check-sla] Error:', err)
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
