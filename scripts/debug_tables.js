import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xxhnwofshjxyiltupbbi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aG53b2ZzaGp4eWlsdHVwYmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODkxMDMsImV4cCI6MjA4MjY2NTEwM30.cGA-JgMuiRwze8U1mUDSPo_H-uaRnwJM-rimsx1_ADg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Fetching details...');
    const tables = ['regions', 'neighborhoods', 'jurisdiction', 'dps'];
    for (const table of tables) {
        const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' }).limit(5);
        if (error) {
            console.log(`Error table ${table}: ${error.message}`);
        } else {
            console.log(`Table ${table} exists with ${count} records.`);
            console.log(JSON.stringify(data, null, 2));
        }
    }
}

run();
