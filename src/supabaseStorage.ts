import { supabase } from './supabaseClient';
import { toast } from 'sonner';

const BUCKET_NAME = 'warrants';

/**
 * Sanitiza o caminho para remover caracteres especiais de forma agressiva.
 * Usado APENAS no upload para garantir nomes de arquivo seguros.
 */
const sanitizePath = (path: string): string => {
    if (!path) return '';
    return path.split('/').map(part =>
        part.normalize('NFD') // Decompõe acentos
            .replace(/[\u0300-\u036f]/g, "") // Remove acentos
            .replace(/[^a-zA-Z0-9._-]/g, '_') // Troca espaços, parênteses e outros por underscore
            .replace(/__+/g, '_') // Estética: remove múltiplos underscores seguidos
    ).join('/');
};

/**
 * Upload de arquivo com nome limpo
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
 * Gera URL pública garantindo encoding correto para o navegador.
 * Aceita tanto o caminho relativo quanto a URL completa (legado).
 */
export const getPublicUrl = (path: string): string => {
    if (!path) return '';

    let relativePath = path;

    // Se já for uma URL completa, extraímos apenas o caminho do arquivo
    if (path.startsWith('http')) {
        const publicStr = `/storage/v1/object/public/${BUCKET_NAME}/`;
        const index = path.indexOf(publicStr);
        if (index !== -1) {
            relativePath = path.substring(index + publicStr.length);
        } else {
            // Se for uma URL de outro tipo, apenas retorna como está
            return path;
        }
    }

    // 1. Decodifica totalmente (caso venha com %20, etc do banco)
    // 2. Remove query params se houver
    const decodedPath = decodeURIComponent(relativePath.split('?')[0]);

    // 3. Recodifica cada segmento de forma limpa.
    // Especial: codifica parênteses '(' e ')' pois alguns servidores não gostam deles soltos na URL
    const cleanPath = decodedPath.split('/').map(segment =>
        encodeURIComponent(segment)
            .replace(/\(/g, '%28')
            .replace(/\)/g, '%29')
    ).join('/');

    const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(cleanPath);

    return data.publicUrl;
};

/**
 * Exclui arquivo do storage
 */
export const deleteFile = async (path: string): Promise<boolean> => {
    try {
        let finalPath = path;
        if (path.startsWith('http')) {
            const publicStr = `/storage/v1/object/public/${BUCKET_NAME}/`;
            const index = path.indexOf(publicStr);
            if (index !== -1) {
                finalPath = path.substring(index + publicStr.length);
            }
        }

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
