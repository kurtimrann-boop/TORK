import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://mmeaypygvurijotudjtk.supabase.co";
// Aşağıdaki tırnak işaretlerinin arasına kopyaladığın şifreyi yapıştır
const supabaseAnonKey = "sb_publishable_tEC1wEBAC2SCwAvsu6LA5A_osFUoMSX"; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);