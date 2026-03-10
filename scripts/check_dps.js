
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xxhnwofshjxyiltupbbi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aG53b2ZzaGp4eWlsdHVwYmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODkxMDMsImV4cCI6MjA4MjY2NTEwM30.cGA-JgMuiRwze8U1mUDSPo_H-uaRnwJM-rimsx1_ADg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const { data, error } = await supabase
        .from('warrants')
        .select('id, name, dp_region')
        .limit(20);

    if (error) {
        console.error('Error fetching warrants:', error.message);
    } else {
        console.log('Current warrants DP regions:');
        data.forEach(w => console.log(`- ${w.name}: [${w.dp_region}]`));
    }
}

check();
