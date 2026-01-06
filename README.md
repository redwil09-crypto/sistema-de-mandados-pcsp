# Sistema de Mandados - PCSP

Este é um sistema avançado para gestão e planejamento de mandados da Polícia Civil do Estado de São Paulo. Ele permite o registro, busca, visualização em mapa e geração de roteiros de diligências.

## 🚀 Funcionalidades

- **Dashboard de Estatísticas**: Visualize a evolução de mandados, crimes mais comuns e metas.
- **Busca Avançada**: Filtre por nome, RG, CPF, número do processo ou crime.
- **Roteiro de Diligências**: Adicione mandados a um roteiro e abra diretamente no Google Maps para otimizar o trajeto.
- **Impressão de Fichas**: Gere PDFs profissionais com foto e dados completos dos alvos.
- **Integração Supabase**: Banco de dados em tempo real e autenticação segura.
- **Modo Noturno**: Interface moderna e adaptativa.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React + Vite + Tailwind CSS
- **Ícones**: Lucide React
- **Gráficos**: Recharts
- **PDF**: jsPDF
- **Backend/Auth**: Supabase

## 📦 Como rodar o projeto

1. **Instale as dependências**:
   ```bash
   npm install
   ```

2. **Configure o ambiente**:
   Crie um arquivo `.env` com as seguintes variáveis:
   ```env
   VITE_SUPABASE_URL=sua_url_aqui
   VITE_SUPABASE_ANON_KEY=sua_chave_aqui
   ```

3. **Inicie o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

4. **Build para produção**:
   ```bash
   npm run build
   ```

## 🔒 Segurança

Este software foi desenvolvido para uso em ambiente de segurança pública. Certifique-se de seguir os protocolos de acesso e proteção de dados.

---
Desenvolvido por **Agente Silva** & **Antigravity AI**.

## 🚀 Deploy na Vercel

Para colocar o sistema online na Vercel, siga estes passos:

1. **Conecte seu GitHub**: Acesse [vercel.com](https://vercel.com), crie uma conta e conecte seu repositório `sistema-de-mandados-pcsp`.
2. **Configure as Variáveis de Ambiente**: No momento do deploy, adicione as seguintes chaves em "Environment Variables":
   - `VITE_SUPABASE_URL`: (Sua URL do Supabase)
   - `VITE_SUPABASE_ANON_KEY`: (Sua chave anônima do Supabase)
3. **Build Settings**: A Vercel deve detectar automaticamente as configurações de Vite. O comando de build deve ser `npm run build` e o diretório de saída `dist`.
4. **Pronto!**: O sistema estará disponível em uma URL `.vercel.app`.
