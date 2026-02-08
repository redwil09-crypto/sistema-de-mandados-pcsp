-- Execute este script no SQL Editor do Supabase para corrigir a estrutura do banco de dados

-- 1. Adicionar o campo para armazenar os documentos do iFood (Array de Textos)
ALTER TABLE public.warrants 
ADD COLUMN IF NOT EXISTS ifood_docs text[] DEFAULT '{}';

-- 2. Garantir que os outros campos do iFood também existam
ALTER TABLE public.warrants 
ADD COLUMN IF NOT EXISTS ifood_number text,
ADD COLUMN IF NOT EXISTS ifood_result text;

-- 3. Atualizar as permições (caso necessário, dependendo da configuração de RLS)
-- Permitir que usuários autenticados vejam e editem a nova coluna
GRANT ALL ON TABLE public.warrants TO authenticated;
GRANT ALL ON TABLE public.warrants TO service_role;

-- 4. Criar um índice para otimizar (opcional, mas recomendado se for usado em filtros futuramente)
CREATE INDEX IF NOT EXISTS idx_warrants_ifood_number ON public.warrants(ifood_number);

-- Comentário de confirmação
COMMENT ON COLUMN public.warrants.ifood_docs IS 'Lista de URLs dos documentos de resposta do iFood';
