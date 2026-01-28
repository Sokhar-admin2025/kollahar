import { createClient } from '@supabase/supabase-js'

// Denna klient använder service_role-nyckeln och FÅR ENBART användas på serversidan.
if (typeof window !== 'undefined') {
  throw new Error('supabaseAdmin får endast användas på serversidan.')
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!url || !serviceRoleKey) {
  // Logga endast på servern; klientkod når aldrig hit
  console.warn('[supabase-admin] SUPABASE_SERVICE_ROLE_KEY eller URL saknas. deleteAccount kommer inte fungera fullt ut.')
}

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

