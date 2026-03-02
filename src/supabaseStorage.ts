import { supabase } from './supabaseClient';
import { toast } from 'sonner';

const BUCKET_NAME = 'warrants';

/**
 * Sanitiza o caminho para remover caracteres especiais, acentos e espaços 
 */
const sanitizePath = (path: string): string => {
    return path.split('/').map(part =>
        part.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9._-]/g, '_') // Mantém apenas alfanuméricos, ponto, underscore e traço
    ).join('/');
};

/**
 * Realiza o upload de um arquivo para o Supabase Storage
 * @param file O arquivo a ser enviado
 * @param path Caminho dentro do bucket (ex: 'photos/id.jpg')
 * @returns O caminho do arquivo no bucket ou null em caso de erro
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
            // toast.error(`Erro no Upload: ${error.message}`);
            return null;
        }

        return data.path;
    } catch (error: any) {
        console.error('[Storage] Erro inesperado no upload:', error);
        return null;
    }
};

/**
 * Obtém a URL pública de um arquivo no storage
 * @param path Caminho do arquivo no bucket
 * @returns A URL pública do arquivo
 */
export const getPublicUrl = (path: string): string => {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    // Remove barra inicial se houver para evitar double slash na URL FINAL do Supabase
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;

    const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(cleanPath);

    return data.publicUrl;
};

/**
 * Remove um arquivo do storage
 * @param path Caminho do arquivo ou URL completa do arquivo no bucket
 */
export const deleteFile = async (path: string): Promise<boolean> => {
    try {
        let finalPath = path;

        // Se for uma URL, tenta extrair o caminho relativo
        if (path.startsWith('http')) {
            const searchStr = `/public/${BUCKET_NAME}/`;
            const index = path.indexOf(searchStr);
            if (index !== -1) {
                finalPath = path.substring(index + searchStr.length);
            }
        }

        // Remova query params se houver na URL (ex: ?t=123)
        finalPath = finalPath.split('?')[0];

        console.log(`[Storage] Deletando: ${finalPath}`);

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([finalPath]);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('[Storage] Erro ao deletar arquivo:', error);
        return false;
    }
};
