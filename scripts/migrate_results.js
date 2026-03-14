
import { createClient } from '@supabase/supabase-js';

// Hardcoded configs do .env (Já que o node ambiental pode não ter dotenv instalado globalmente)
const supabaseUrl = 'https://xxhnwofshjxyiltupbbi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aG53b2ZzaGp4eWlsdHVwYmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODkxMDMsImV4cCI6MjA4MjY2NTEwM30.cGA-JgMuiRwze8U1mUDSPo_H-uaRnwJM-rimsx1_ADg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateWarrants() {
    console.log('--- Iniciando Migração de Status de Fechamento ---');

    const { data: warrants, error } = await supabase
        .from('warrants')
        .select('id, type, fulfillment_result, status');

    if (error) {
        console.error('Erro ao buscar mandados:', error);
        return;
    }

    const fulfilledWarrants = warrants.filter(w => w.status === 'CUMPRIDO');
    console.log(`Mandados CUMPRIDOS para processar: ${fulfilledWarrants.length}`);

    let updatedCount = 0;

    for (const warrant of fulfilledWarrants) {
        const type = warrant.type;
        const currentResult = warrant.fulfillment_result;
        const isSearch = type?.toLowerCase().includes('busca') || type?.toLowerCase().includes('apren');

        let newResult = null;

        if (!currentResult || currentResult === 'Fechado' || currentResult === 'Apreendido' || currentResult === 'CUMPRIDO') {
            newResult = isSearch ? 'APREENDIDO' : 'PRESO';
        }

        if (newResult && newResult !== currentResult) {
            console.log(`Atualizando Mandado ${warrant.id}: [${currentResult || 'Vazio'}] -> [${newResult}]`);
            
            const { error: updateError } = await supabase
                .from('warrants')
                .update({ fulfillment_result: newResult })
                .eq('id', warrant.id);

            if (updateError) {
                console.error(`Erro no mandado ${warrant.id}:`, updateError);
            } else {
                updatedCount++;
            }
        }
    }

    console.log('--- Migração Concluída ---');
    console.log(`Total de mandados atualizados: ${updatedCount}`);
}

migrateWarrants();
