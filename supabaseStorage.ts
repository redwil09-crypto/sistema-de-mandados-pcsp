import { supabase } from './supabaseClient';

const BUCKET_NAME = 'warrants';

/**
 * Realiza o upload de um arquivo para o Supabase Storage
 * @param file O arquivo a ser enviado
 * @param path Caminho dentro do bucket (ex: 'photos/id.jpg')
 * @returns O caminho do arquivo no bucket ou null em caso de erro
 */
export const uploadFile = async (file: File, path: string): Promise<string | null> => {
    try {
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) throw error;
        return data.path;
    } catch (error) {
        console.error('Erro no upload de arquivo:', error);
        return null;
    }
};

/**
 * Obtém a URL pública de um arquivo no storage
 * @param path Caminho do arquivo no bucket
 * @returns A URL pública do arquivo
 */
export const getPublicUrl = (path: string): string => {
    const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);

    return data.publicUrl;
};

/**
 * Remove um arquivo do storage
 * @param path Caminho do arquivo no bucket
 */
export const deleteFile = async (path: string): Promise<boolean> => {
    try {
        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([path]);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Erro ao deletar arquivo:', error);
        return false;
    }
};
