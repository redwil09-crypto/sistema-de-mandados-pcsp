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
        part.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/__+/g, '_')
    ).join('/');
};

/**
 * Upload de arquivo com sanitização agressiva do caminho.
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
 * Gera URL pública robusta.
 * O Supabase já faz o encoding interno, então passamos o caminho TOTALMENTE DECODIFICADO.
 */
export const getPublicUrl = (path: string): string => {
    if (!path) return '';

    let relativePath = path;

    // 1. Se for uma URL completa, extrai apenas a parte do objeto
    if (path.startsWith('http')) {
        const publicPrefix = `/storage/v1/object/public/${BUCKET_NAME}/`;
        const index = path.indexOf(publicPrefix);
        if (index !== -1) {
            relativePath = path.substring(index + publicPrefix.length);
        } else {
            // Se não for do nosso bucket, retorna a URL original (limpa de espaços se necessário)
            return path.split('?')[0].replace(/ /g, '%20');
        }
    }

    // 2. Remove query params (?t=...)
    const cleanPath = relativePath.split('?')[0];

    // 3. DECODIFICA totalmente para obter o nome literal (ex: "resumo peca (36).pdf")
    // Fazemos isso várias vezes para garantir que limpe double encodings residuais
    let literalPath = cleanPath;
    try {
        literalPath = decodeURIComponent(cleanPath);
        // Tenta decodificar de novo caso haja double encoding no banco (ex: %2520 -> %20 -> " ")
        if (literalPath.includes('%')) {
            literalPath = decodeURIComponent(literalPath);
        }
    } catch (e) {
        console.warn("[Storage] Erro ao decodificar path:", cleanPath);
    }

    // 4. Deixa o Supabase gerar a URL final a partir do nome LITERAL
    const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(literalPath);

    return data.publicUrl;
};

/**
 * Exclui arquivo do storage.
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
