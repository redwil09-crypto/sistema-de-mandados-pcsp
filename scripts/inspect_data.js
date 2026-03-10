
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xxhnwofshjxyiltupbbi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aG53b2ZzaGp4eWlsdHVwYmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODkxMDMsImV4cCI6MjA4MjY2NTEwM30.cGA-JgMuiRwze8U1mUDSPo_H-uaRnwJM-rimsx1_ADg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
    const { data, error } = await supabase
        .from('warrants')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching warrants:', error.message);
    } else if (data && data.length > 0) {
        console.log('Sample warrant data keys:', Object.keys(data[0]));
        console.log('Sample warrant data values:', data[0]);
    } else {
        console.log('No warrants found.');
    }
}

inspect();
