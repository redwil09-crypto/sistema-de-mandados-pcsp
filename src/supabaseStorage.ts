import { supabase } from './supabaseClient';
import { toast } from 'sonner';

const BUCKET_NAME = 'warrants';

/**
 * Realiza o upload de um arquivo para o Supabase Storage
 * @param file O arquivo a ser enviado
 * @param path Caminho dentro do bucket (ex: 'photos/id.jpg')
 * @returns O caminho do arquivo no bucket ou null em caso de erro
 */
export const uploadFile = async (file: File, path: string): Promise<string | null> => {
    try {
        console.log(`Starting upload for file: ${file.name} to path: ${path} in bucket: ${BUCKET_NAME}`);
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('Supabase upload error object:', error);
            toast.error(`Erro no Upload: ${error.message}`);
            throw error;
        }

        console.log('Upload successful, data:', data);
        return data.path;
    } catch (error: any) {
        console.error('Erro no upload de arquivo (catch block):', error);
        // Toast already shown if it was a supabase error, but if it came from elsewhere:
        if (!error.message?.includes('Upload')) {
            toast.error(`Erro inesperado no upload: ${error.message || 'Erro desconhecido'}`);
        }
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
