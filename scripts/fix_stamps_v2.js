
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xxhnwofshjxyiltupbbi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aG53b2ZzaGp4eWlsdHVwYmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODkxMDMsImV4cCI6MjA4MjY2NTEwM30.cGA-JgMuiRwze8U1mUDSPo_H-uaRnwJM-rimsx1_ADg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAllStamps() {
    console.log('--- Iniciando Correção Forçada de Carimbos ---');

    // 1. Buscar ABSOLUTAMENTE TODOS os mandados para garantir que não escape nada
    const { data: warrants, error } = await supabase
        .from('warrants')
        .select('id, type, fulfillment_result, status, name');

    if (error) {
        console.error('Erro ao acessar o banco:', error);
        return;
    }

    console.log(`Analisando ${warrants.length} mandados no total...`);

    let updatedCount = 0;

    for (const warrant of warrants) {
        const type = warrant.type || '';
        const currentResult = (warrant.fulfillment_result || '').toUpperCase();
        
        // Regra de Busca/Menor
        const isSearch = type.toLowerCase().includes('busca') || 
                         type.toLowerCase().includes('apren') || 
                         type.toLowerCase().includes('menor');

        let newResult = null;

        // Se o resultado atual for FECHADO, CUMPRIDO ou estiver Vazio mas o status geral for CUMPRIDO
        if (currentResult === 'FECHADO' || currentResult === 'CUMPRIDO' || currentResult === 'APREENDIDO (MINÚSCULO?)' || 
            (warrant.status === 'CUMPRIDO' && !warrant.fulfillment_result)) {
            
            newResult = isSearch ? 'APREENDIDO' : 'PRESO';
        }

        // Caso especial: Se o tipo for busca e estiver apenas como "PRESO" ou "CUMPRIDO", mudar para APREENDIDO
        if (isSearch && (currentResult === 'PRESO' || currentResult === 'CUMPRIDO')) {
            newResult = 'APREENDIDO';
        }

        if (newResult && newResult !== warrant.fulfillment_result) {
            console.log(`Corrigindo [${warrant.name}]: [${warrant.fulfillment_result}] -> [${newResult}]`);
            
            const { error: updateError } = await supabase
                .from('warrants')
                .update({ fulfillment_result: newResult })
                .eq('id', warrant.id);

            if (!updateError) updatedCount++;
        }
    }

    console.log('--- Correção Concluída ---');
    console.log(`Total de mandados corrigidos no banco: ${updatedCount}`);
}

fixAllStamps();
