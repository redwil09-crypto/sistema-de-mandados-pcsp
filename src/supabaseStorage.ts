import { supabase } from './supabaseClient';
import { toast } from 'sonner';

const BUCKET_NAME = 'warrants';

/**
 * Sanitiza o caminho para remover caracteres especiais.
 * Aplicado apenas no momento do UPLOAD para novos arquivos.
 */
const sanitizePath = (path: string): string => {
    if (!path) return '';
    return path.split('/').map(part =>
        part.normalize('NFD') // Decompõe acentos
            .replace(/[\u0300-\u036f]/g, "") // Remove acentos
            .replace(/[^a-zA-Z0-9._-]/g, '_') // Mantém apenas alfanuméricos, ponto, underscore e traço
            .replace(/__+/g, '_') // Evita múltiplos underscores seguidos
    ).join('/');
};

/**
 * Realiza o upload de um arquivo para o Supabase Storage.
 */
export const uploadFile = async (file: File, path: string): Promise<string | null> => {
    try {
        const sanitizedPath = sanitizePath(path);
        console.log(`[Storage] Upload: ${file.name} -> ${sanitizedPath}`);

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(sanitizedPath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('[Storage] Erro no upload:', error);
            return null;
        }

        return data.path;
    } catch (error: any) {
        console.error('[Storage] Erro inesperado no upload:', error);
        return null;
    }
};

/**
 * Obtém a URL pública de um arquivo com encoding robusto para o navegador.
 */
export const getPublicUrl = (path: string): string => {
    if (!path) return '';

    let pathForClient = path;

    // 1. Se for uma URL completa, extrai a parte relativa para podermos recodificar corretamente
    if (path.startsWith('http')) {
        const publicPrefix = `/storage/v1/object/public/${BUCKET_NAME}/`;
        const index = path.indexOf(publicPrefix);
        if (index !== -1) {
            pathForClient = path.substring(index + publicPrefix.length);
        } else {
            // URL externa? Garante apenas espaços limpos
            return path.replace(/ /g, '%20');
        }
    }

    // 2. Remove query params (?t=...) e decodifica para obter o nome literal real (ex: "resumo peca (36).pdf")
    const cleanPath = pathForClient.split('?')[0];
    let literalName = cleanPath;
    try {
        literalName = decodeURIComponent(cleanPath);
        // Proteção contra double-encoding (%2520 -> %20 -> " ")
        if (literalName.includes('%')) {
            literalName = decodeURIComponent(literalName);
        }
    } catch (e) {
        console.warn("[Storage] Erro ao decodificar path:", cleanPath);
    }

    // 3. Deixa o cliente do Supabase gerar a URL pública a partir do nome real
    const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(literalName);

    // 4. CORREÇÃO CRÍTICA: O Supabase as vezes gera URLs com ( ) sem codificar.
    // Navegadores/Servidores PCSP podem rejeitar links com caracteres especiais soltos.
    // Vamos garantir que espaços, parênteses e outros sejam codificados de forma amigável para o Gateway.
    return data.publicUrl
        .replace(/ /g, '%20')      // Espaço
        .replace(/\(/g, '%28')    // Abre parênteses
        .replace(/\)/g, '%29');   // Fecha parênteses
};

/**
 * Exclui um arquivo do storage.
 */
export const deleteFile = async (path: string): Promise<boolean> => {
    try {
        let finalPath = path;

        if (path.startsWith('http')) {
            const publicPrefix = `/storage/v1/object/public/${BUCKET_NAME}/`;
            const index = path.indexOf(publicPrefix);
            if (index !== -1) {
                finalPath = path.substring(index + publicPrefix.length);
            }
        }

        // Decodifica para passar o nome real ao método remove
        const decodedPath = decodeURIComponent(finalPath.split('?')[0]);
        console.log(`[Storage] Deletando: ${decodedPath}`);

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([decodedPath]);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('[Storage] Erro ao deletar arquivo:', error);
        return false;
    }
};
