
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    const msg = 'Supabase URL e Anon Key são obrigatórios. Verifique suas variáveis de ambiente.';
    alert(msg);
    throw new Error(msg);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
