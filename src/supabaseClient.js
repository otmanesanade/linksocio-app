import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nknauhsucrnrhmtldick.supabase.co'
const supabaseKey = 'sb_publishable_Hd83zLKF-81g4pj-hKMK3w_MOcEX4fD'

export const supabase = createClient(supabaseUrl, supabaseKey)
