import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Rensar all användardata i public-schemat innan auth.users raderas.
 * Undviker "Database error deleting user" när någon FK saknar ON DELETE CASCADE.
 * Körs med service role (supabaseAdmin) så RLS inte blockerar.
 */
async function deletePublicDataForUser(userId: string) {
  if (!supabaseAdmin) return

  const tables: { table: string; column: string }[] = [
    { table: 'user_hidden_conversations', column: 'user_id' },
    { table: 'conversations', column: 'buyer_id' },
    { table: 'conversations', column: 'seller_id' },
    { table: 'leads', column: 'user_id' },
    { table: 'import_logs', column: 'user_id' },
    { table: 'deletion_logs', column: 'user_id' },
    { table: 'favorites', column: 'user_id' },
    { table: 'listings', column: 'user_id' },
    { table: 'profiles', column: 'id' },
  ]

  for (const { table, column } of tables) {
    const q = supabaseAdmin.from(table).delete().eq(column, userId)
    const { error } = await q
    if (error) {
      console.warn(`[delete-account] Rensning av ${table} för användare ${userId}:`, error.message)
    }
  }
}

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

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !supabaseAdmin) {
      console.error('[delete-account] SUPABASE_SERVICE_ROLE_KEY saknas – konto kan inte raderas från Auth. Se docs/DELETE_ACCOUNT_CHECK.md')
      return NextResponse.json(
        {
          error:
            'Raderning av konto är inte fullt konfigurerad på servern. Kontakta support om problemet kvarstår.',
        },
        { status: 503 }
      )
    }

    await deletePublicDataForUser(userId)

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteError) {
      const errMsg = typeof deleteError === 'object' && deleteError !== null && 'message' in deleteError
        ? (deleteError as { message?: string; code?: string }).message
        : String(deleteError)
      const errCode = typeof deleteError === 'object' && deleteError !== null && 'code' in deleteError
        ? (deleteError as { code?: string }).code
        : undefined
      console.error(
        '[delete-account] admin.deleteUser misslyckades:',
        { message: errMsg, code: errCode, userId }
      )
      return NextResponse.json(
        { error: 'Kunde inte radera ditt konto just nu. Försök igen eller kontakta support.' },
        { status: 500 }
      )
    }

    await supabase.auth.signOut()

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Fel vid radering av konto:', err)
    return NextResponse.json({ error: 'Ett oväntat fel inträffade vid radering av konto.' }, { status: 500 })
  }
}

