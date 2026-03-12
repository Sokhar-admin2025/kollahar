import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const body = (await request.json().catch(() => null)) as
      | {
          error_message?: string
          stack_trace?: string
          path?: string
          user_id?: string
        }
      | null

    const errorMessage = body?.error_message?.trim()
    if (!errorMessage) {
      return NextResponse.json(
        { success: false, error: 'error_message saknas' },
        { status: 400 }
      )
    }

    const stackTrace = body?.stack_trace?.trim() || null
    const path = body?.path?.trim() || null
    const userId = body?.user_id?.trim() || null

    // Försök infoga – men svälj fel tyst (vi vill inte krascha appen)
    const { error } = await supabase.from('system_errors').insert({
      error_message: errorMessage,
      stack_trace: stackTrace,
      path,
      user_id: userId,
      status: 'open',
    })

    if (error) {
      console.error('[log-error] insert failed', error.message)
      // Svara ändå 200 – loggning får aldrig krascha appen
      return NextResponse.json({ success: false })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[log-error] unexpected error', err)
    // Svara 200 även här – viktigast är att inte krascha frontend
    return NextResponse.json({ success: false })
  }
}

