// Update regions script
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Based on visual analysis of the map boundaries:
// 1º DP (Green/East area): Bandeira Branca, Varadouro, Rio Abaixo, areas east of Centro (Pq. Itamarati etc)
const keywords1DP = ['BANDEIRA BRANCA', 'VARADOURO', 'RIO ABAIXO', 'SANTA MARIA', 'ITAMARATI', 'FRANCISO DE ASSIS', 'SANTO ANTONIO', 'COLONIAL'];

// 2º DP (Purple/West area): Igarapés, São Silvestre, Pagador Andrade, Parateí, areas west/southwest 
const keywords2DP = ['IGARAPES', 'IGARAPE', 'SAO SILVESTRE', 'PAGADOR', 'PARATEI', 'ESPERANCA', 'NOVA ESPERANCA', 'BAIXOS'];

// 3º DP (Yellow/Central/North-Central area): Centro, Vila Branca, Jardim Florida, Jd Califórnia, S. João
const keywords3DP = ['CENTRO', 'VILA BRANCA', 'FLORIDA', 'CALIFORNIA', 'SAO JOAO', 'S JOAO', 'S. JOAO', 'JACAREI', 'AVENIDA'];

// 4º DP (Light Green/Northwest area): Igaratá, Remedinho, Jd. Indústrias, areas far north.
const keywords4DP = ['IGARATA', 'REMEDINHO', 'INDUSTRIAS', 'RURAL', 'CHACARAS', 'CASSUNUNGA', 'PAGADOR ANDRADE'];

function normalizeText(text) {
    if (!text) return '';
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function determineDp(locationStr) {
    if (!locationStr) return null;
    const loc = normalizeText(locationStr);

    // Try 3DP first as it has Centro and common areas
    if (keywords3DP.some(k => loc.includes(k))) return '3º DP';
    if (keywords1DP.some(k => loc.includes(k))) return '1º DP';
    if (keywords2DP.some(k => loc.includes(k))) return '2º DP';
    if (keywords4DP.some(k => loc.includes(k))) return '4º DP';

    return null;
}

async function run() {
    console.log('Fetching warrants...');
    const { data: warrants, error: fetchError } = await supabase
        .from('warrants')
        .select('id, location, dp_region');

    if (fetchError) {
        console.error('Error fetching warrants:', fetchError);
        return;
    }

    console.log(`Found ${warrants.length} warrants.`);
    let updatedCount = 0;

    for (const w of warrants) {
        if (!w.dp_region && w.location) {
            const detectedDp = determineDp(w.location);
            if (detectedDp) {
                console.log(`Setting ${detectedDp} for location: ${w.location}`);
                const { error: updateError } = await supabase
                    .from('warrants')
                    .update({ dp_region: detectedDp })
                    .eq('id', w.id);

                if (updateError) {
                    console.error(`Failed to update ${w.id}:`, updateError);
                } else {
                    updatedCount++;
                }
            }
        }
    }

    console.log(`Finished processing. Updated ${updatedCount} warrants.`);
}

run();
