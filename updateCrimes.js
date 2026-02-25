export const SUPABASE_URL = "https://xxhnwofshjxyiltupbbi.supabase.co";
export const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aG53b2ZzaGp4eWlsdHVwYmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODkxMDMsImV4cCI6MjA4MjY2NTEwM30.cGA-JgMuiRwze8U1mUDSPo_H-uaRnwJM-rimsx1_ADg";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const standardizeCrime = (crime) => {
    if (!crime) return null;
    let old = crime;

    // Explicit mappings based on typical values
    if (old === 'Pensão alimenticia') return 'Pensão Alimentícia';
    if (old === 'Lesão corporal') return 'Lesão Corporal';
    if (old === 'Estupro' || old === 'Crimes Sexuais (Estupro)' || old === 'Estupro / Crime Sexual') return 'Estupro / Crimes Sexuais';
    if (old === 'Extorsão mediante sequestro') return 'Extorsão Mediante Sequestro';
    if (old === 'Armas (Lei 10826)' || old === 'Armas') return 'Posse/Porte de Arma';
    if (old === 'Drogas/Trafico') return 'Tráfico de Drogas';
    if (old === 'Violencia domestica') return 'Violência Doméstica';

    // Catch-all patterns
    const L = old.toLowerCase();
    if (L.includes('pensão') || L.includes('pensao') || L.includes('alimenticia') || L.includes('alimentícia')) return 'Pensão Alimentícia';
    if (L.includes('tráfico') || L.includes('trafico')) return 'Tráfico de Drogas';
    if (L.includes('estupro') || L.includes('dignidade sexual') || L.includes('sexual')) return 'Estupro / Crimes Sexuais';
    if (L.includes('violencia domestica') || L.includes('violência doméstica') || L.includes('maria da penha')) return 'Violência Doméstica';
    if (L.includes('arma')) return 'Posse/Porte de Arma';
    if (L.includes('lesão corporal') || L.includes('lesão')) return 'Lesão Corporal';
    if (L.includes('homicídio') || L.includes('homicidio')) return 'Homicídio';
    if (L.includes('furto')) return 'Furto';
    if (L.includes('roubo') || L.includes('assalto')) return 'Roubo';
    if (L.includes('estelionato')) return 'Estelionato';
    if (L.includes('ameaça') || L.includes('ameaca')) return 'Ameaça';
    if (L.includes('receptação') || L.includes('receptacao')) return 'Receptação';
    if (L.includes('feminicídio') || L.includes('feminicidio')) return 'Feminicídio';
    if (L.includes('trânsito') || L.includes('transito') || L.includes('embriaguez')) return 'Crimes de Trânsito';
    if (L.includes('desacato')) return 'Desacato';
    if (L.includes('resistência') || L.includes('resistencia')) return 'Resistência';
    if (L.includes('extorsão mediante') || L.includes('sequestro')) return 'Extorsão Mediante Sequestro';
    if (L.includes('extorsão') || L.includes('extorsao')) return 'Extorsão';

    return old;
};


async function run() {
    console.log("Fetching distinct crimes...");
    const { data: dbData, error } = await supabase.from('warrants').select('id, crime');

    if (error) {
        console.error("error", error)
        return
    }

    let crimesSet = new Set();
    dbData.forEach(r => crimesSet.add(r.crime));
    console.log("Distinct crimes before:", Array.from(crimesSet));

    let updatedCount = 0;
    for (const record of dbData) {
        const newCrime = standardizeCrime(record.crime);
        if (newCrime && newCrime !== record.crime) {
            console.log(`Will update: ${record.crime} -> ${newCrime}`);
            await supabase.from('warrants').update({ crime: newCrime }).eq('id', record.id);
            updatedCount++;
        }
    }

    console.log("Updated: " + updatedCount)

}

run();
