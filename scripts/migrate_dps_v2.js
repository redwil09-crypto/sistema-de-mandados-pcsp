
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xxhnwofshjxyiltupbbi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aG53b2ZzaGp4eWlsdHVwYmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODkxMDMsImV4cCI6MjA4MjY2NTEwM30.cGA-JgMuiRwze8U1mUDSPo_H-uaRnwJM-rimsx1_ADg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrate() {
    // First, find all unique DP regions to see what we are dealing with
    const { data: allWarrants, error: fetchError } = await supabase
        .from('warrants')
        .select('dp_region');

    if (fetchError) {
        console.error('Error fetching:', fetchError.message);
        return;
    }

    const uniqueRegions = [...new Set(allWarrants.map(w => w.dp_region))];
    console.log('Found unique DP regions in DB:', uniqueRegions);

    const mappings = {
        '01º DP JACAREÍ': '01º DP',
        '02º DP JACAREÍ': '02º DP',
        '03º DP JACAREÍ': '03º DP',
        '04º DP JACAREÍ': '04º DP',
        '1º DP JACAREÍ': '01º DP',
        '2º DP JACAREÍ': '02º DP',
        '3º DP JACAREÍ': '03º DP',
        '4º DP JACAREÍ': '04º DP',
        '1º DP': '01º DP',
        '2º DP': '02º DP',
        '3º DP': '03º DP',
        '4º DP': '04º DP',
    };

    for (const [from, to] of Object.entries(mappings)) {
        if (uniqueRegions.includes(from)) {
            console.log(`Migrating ${from} to ${to}...`);
            const { data, error } = await supabase
                .from('warrants')
                .update({ dp_region: to })
                .eq('dp_region', from)
                .select('id');

            if (error) {
                console.error(`Error migrating ${from}:`, error.message);
            } else {
                console.log(`Successfully updated ${data?.length || 0} records for ${from}`);
            }
        }
    }
}

migrate();
