import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl) supabaseUrl = supabaseUrl.replace(/["']/g, '').trim()
  if (supabaseKey) supabaseKey = supabaseKey.replace(/["']/g, '').trim()

  if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
    console.warn('Varning: Ogiltig Supabase URL, använder placeholder för build.')
    supabaseUrl = 'https://placeholder.supabase.co'
  }
  if (!supabaseKey) {
    supabaseKey = 'placeholder-key'
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
