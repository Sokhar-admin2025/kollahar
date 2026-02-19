import { createClient } from '@supabase/supabase-js'

// Denna klient använder service_role-nyckeln och FÅR ENBART användas på serversidan.
if (typeof window !== 'undefined') {
  throw new Error('supabaseAdmin får endast användas på serversidan.')
}

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()

if (!url || !serviceRoleKey) {
  console.warn('[supabase-admin] SUPABASE_SERVICE_ROLE_KEY eller URL saknas. Service role krävs för leads, listings bypass, m.m.')
}

// Skapa endast klient om vi faktiskt har en service-role-nyckel
export const supabaseAdmin = url && serviceRoleKey
  ? createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null


