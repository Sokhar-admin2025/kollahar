import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Ingen inloggad användare.' }, { status: 401 })
    }

    const userId = user.id

    if (process.env.SUPABASE_SERVICE_ROLE_KEY && supabaseAdmin) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteError) {
        console.error('Kunde inte radera konto via admin.deleteUser:', deleteError)
        return NextResponse.json({ error: 'Kunde inte radera ditt konto just nu. Försök igen.' }, { status: 500 })
      }

      // Ta bort session-cookies så klienten blir utloggad
      await supabase.auth.signOut()
    } else {
      try {
        await supabase.from('favorites').delete().eq('user_id', userId)
        await supabase.from('listings').delete().eq('user_id', userId)
        await supabase.from('profiles').delete().eq('id', userId)
      } catch (err) {
        console.error('Kunde inte radera publika data för användare:', err)
        return NextResponse.json({ error: 'Kunde inte radera ditt konto just nu.' }, { status: 500 })
      }

      await supabase.auth.signOut()
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Fel vid radering av konto:', err)
    return NextResponse.json({ error: 'Ett oväntat fel inträffade vid radering av konto.' }, { status: 500 })
  }
}

