
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xxhnwofshjxyiltupbbi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aG53b2ZzaGp4eWlsdHVwYmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODkxMDMsImV4cCI6MjA4MjY2NTEwM30.cGA-JgMuiRwze8U1mUDSPo_H-uaRnwJM-rimsx1_ADg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrate() {
    const mappings = [
        { from: '01º DP JACAREÍ', to: '01º DP' },
        { from: '02º DP JACAREÍ', to: '02º DP' },
        { from: '03º DP JACAREÍ', to: '03º DP' },
        { from: '04º DP JACAREÍ', to: '04º DP' },
        { from: '1º DP', to: '01º DP' },
        { from: '2º DP', to: '02º DP' },
        { from: '3º DP', to: '03º DP' },
        { from: '4º DP', to: '04º DP' },
    ];

    for (const { from, to } of mappings) {
        console.log(`Migrating ${from} to ${to}...`);
        try {
            // Note the column name is 'dp_region' in the DB
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
        } catch (e) {
            console.error(`Exception migrating ${from}:`, e);
        }
    }
    console.log('Migration finished.');
}

migrate();
