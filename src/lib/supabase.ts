import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase initialization error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
