# SPEC: Sistema de Mandados - PCSP

Versão: 1.0.0  
Data: 2026-05-31  
Status: Aprovado  

---

## 1. Objetivo

O **Sistema de Mandados PCSP** é uma aplicação web voltada para a gestão, planejamento e otimização do cumprimento de mandados de prisão e busca e apreensão da Polícia Civil do Estado de São Paulo. Seu objetivo principal é fornecer ferramentas intuitivas para delegados e investigadores localizarem alvos, organizarem rotas de diligências otimizadas e exportarem relatórios.

### 1.1 Resultado esperado

- **Dashboard Integrado**: Exibição de gráficos e indicadores estatísticos de produtividade, tipos de crimes e cumprimento de mandados.
- **Módulo de Pesquisa e Filtros**: Busca rápida e avançada de mandados ativos.
- **Roteirizador Otimizado**: Seleção de mandados e visualização em mapas com exportação direta para o Google Maps.
- **Geração de PDF**: Fichas individuais detalhadas dos alvos.
- **Sincronização em Tempo Real**: Conexão com o Supabase para armazenamento persistente dos mandados e logs.

### 1.2 Fora de escopo

- Integração direta com sistemas nacionais restritos da Polícia Federal (SINESP/INFOSEG) sem API homologada.
- Rastreamento em tempo real de viaturas via GPS integrado à aplicação (apenas geração de link para navegação externa).

---

## 2. Glossário

| Termo | Significado |
|-------|-------------|
| **Mandado** | Ordem judicial de prisão ou de busca e apreensão a ser cumprida pela equipe policial. |
| **PCSP** | Polícia Civil do Estado de São Paulo. |
| **Supabase** | Backend-as-a-Service utilizado para autenticação e persistência de dados do sistema. |
| **Diligência** | Atividade externa realizada pelos agentes para cumprimento da ordem judicial. |

---

## 3. Arquitetura Geral

O frontend é uma Single Page Application (SPA) construída em React com Vite e estilizada com Tailwind CSS. A comunicação e armazenamento de dados são intermediados diretamente com o Supabase Client.

```
[ Frontend SPA (React + Vite) ] <== HTTPS / Realtime ==> [ Supabase Services ]
             ||                                                    ||
    (jsPDF, Recharts, Leaflet)                               (Auth, PostgreSQL, Storage)
```

---

## 4. Stack e Dependências

| Camada | Tecnologia | Versão | Razão |
|--------|-----------|--------|-------|
| Frontend | React | ^19.2.3 | Biblioteca canônica para construção da interface. |
| Build Tool | Vite | ^6.2.0 | Bundler extremamente rápido para desenvolvimento SPA. |
| Estilização | Tailwind CSS | ^3.4.1 | Design responsivo rápido com utilitários utilitários. |
| Banco / Auth | Supabase | ^2.98.0 | Banco de dados PostgreSQL gerenciado e autenticação integrada. |
| Mapas | React Leaflet | ^5.0.0 | Renderização offline e online de mapas de rotas. |
| Relatórios | jsPDF | ^3.0.4 | Geração de PDFs de fichas de alvos no client-side. |

---

## 5. Modelo de Dados

### 5.1 Entidades

#### Mandado (Warrant)

```typescript
export interface Warrant {
  id: string;
  nome_alvo: string;
  rg?: string;
  cpf?: string;
  numero_processo: string;
  crime: string;
  status: 'pendente' | 'cumprido' | 'devolvido';
  endereco: string;
  latitude?: number;
  longitude?: number;
  data_expedicao: string;
  observacoes?: string;
  criado_em: string;
}
```

---

## 6. Sprints e Entregas futuras

Este projeto seguirá o framework de desenvolvimento guiado por sprints com o Harness de Autopilot:

1. **Sprint 1: Fundação & Integração Supabase**
   - Configuração do client do Supabase, sincronização das tabelas de mandados e autenticação básica.
2. **Sprint 2: Interface Visual & Dashboard**
   - Criação do dashboard com Recharts e da listagem de mandados com filtros avançados.
3. **Sprint 3: Roteirizador & Mapas**
   - Integração com Leaflet para visualização espacial dos mandados e exportação de rotas otimizadas.
