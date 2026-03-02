import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xxhnwofshjxyiltupbbi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aG53b2ZzaGp4eWlsdHVwYmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODkxMDMsImV4cCI6MjA4MjY2NTEwM30.cGA-JgMuiRwze8U1mUDSPo_H-uaRnwJM-rimsx1_ADg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Fetching all...');
    const { data: warrants, error } = await supabase
        .from('warrants')
        .select('name, location, latitude, longitude, dp_region');

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Total: ${warrants.length}`);
    warrants.forEach(w => {
        console.log(`[${w.dp_region || 'N/I'}] ${w.name} | ${w.location} | Lat: ${w.latitude} | Lng: ${w.longitude}`);
    });
}

run();
