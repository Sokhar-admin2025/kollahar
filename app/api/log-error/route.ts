import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Använd admin-klient – endpointen anropas från instrumentation (ingen user-session)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      error_message?: string
      stack_trace?: string
      path?: string
      user_id?: string
      source?: string
    } | null

    const errorMessage = body?.error_message?.trim()
    if (!errorMessage) {
      return NextResponse.json(
        { success: false, error: 'error_message saknas' },
        { status: 400 }
      )
    }

    const supabase = getAdminClient()

    const { error } = await supabase.from('system_errors').insert({
      error_message: errorMessage,
      stack_trace: body?.stack_trace?.trim() || null,
      path: body?.path?.trim() || null,
      user_id: body?.user_id?.trim() || null,
      source: body?.source || 'main-app',
      status: 'open',
    })

    if (error) {
      console.error('[log-error] insert failed', error.message)
      return NextResponse.json({ success: false })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[log-error] unexpected error', err)
    return NextResponse.json({ success: false })
  }
}
