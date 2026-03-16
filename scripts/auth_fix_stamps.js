
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xxhnwofshjxyiltupbbi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aG53b2ZzaGp4eWlsdHVwYmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODkxMDMsImV4cCI6MjA4MjY2NTEwM30.cGA-JgMuiRwze8U1mUDSPo_H-uaRnwJM-rimsx1_ADg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAllStampsWithAuth() {
    console.log('--- Iniciando Correção com Autenticação ---');

    // 1. Logar no sistema para ter acesso aos dados
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'william.castro@policiacivil.sp.gov.br',
        password: 'Wi180181@'
    });

    if (authError) {
        console.error('Erro na autenticação:', authError.message);
        return;
    }

    console.log('Autenticado com sucesso como:', authData.user.email);

    // 2. Buscar mandados
    const { data: warrants, error: fetchError } = await supabase
        .from('warrants')
        .select('id, name, type, fulfillment_result, status');

    if (fetchError) {
        console.error('Erro ao buscar mandados:', fetchError.message);
        return;
    }

    console.log(`Encontrados ${warrants.length} mandados.`);

    let updatedCount = 0;

    for (const warrant of warrants) {
        const type = (warrant.type || '').toLowerCase();
        const currentResult = (warrant.fulfillment_result || '').trim();
        const status = warrant.status;

        // Regra para decidir o carimbo correto
        const isSearch = type.includes('busca') || type.includes('apren') || type.includes('menor');
        
        let newResult = null;

        // Se o resultado for "FECHADO" ou "Fechado" ou "CUMPRIDO" ou se estiver vazio mas o status for CUMPRIDO
        if (currentResult.toUpperCase() === 'FECHADO' || 
            currentResult.toUpperCase() === 'CUMPRIDO' || 
            (status === 'CUMPRIDO' && !currentResult)) {
            
            newResult = isSearch ? 'APREENDIDO' : 'PRESO';
        }

        // Se for busca e estiver como "PRESO", corrigir para "APREENDIDO"
        if (isSearch && currentResult.toUpperCase() === 'PRESO') {
            newResult = 'APREENDIDO';
        }

        if (newResult && newResult !== warrant.fulfillment_result) {
            console.log(`Corrigindo [${warrant.name}]: [${warrant.fulfillment_result || 'Vazio'}] -> [${newResult}]`);
            
            const { error: updateError } = await supabase
                .from('warrants')
                .update({ fulfillment_result: newResult })
                .eq('id', warrant.id);

            if (!updateError) {
                updatedCount++;
            } else {
                console.error(`Erro ao atualizar ${warrant.name}:`, updateError.message);
            }
        }
    }

    console.log('--- Fim da Operação ---');
    console.log(`Total de carimbos corrigidos: ${updatedCount}`);
}

fixAllStampsWithAuth();
