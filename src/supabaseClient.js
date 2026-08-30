import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nknauhsucrnrhmtldick.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Hd83zLKF-81g4pj-hKMK3w_MOcEX4fD'

export const supabase = createClient(supabaseUrl, supabaseKey)

