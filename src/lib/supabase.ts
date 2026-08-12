import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mubjklmroxoooywwjkel.supabase.co';
const supabaseAnonKey = 'sb_publishable_KWpP2f43FRCQsoGN6LFHAQ_Lg5X_21v';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
