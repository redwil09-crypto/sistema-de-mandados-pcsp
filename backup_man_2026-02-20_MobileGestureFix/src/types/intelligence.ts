
export interface TacticalIntelligence {
    summary: string;              // Resumo Estratégico Consolidado
    timeline: Array<{             // Linha do tempo estratégica
        date: string;
        event: string;
        source: string;
    }>;
    locations: Array<{           // Endereços
        address: string;
        context: string;
        priority: 'Alta' | 'Média' | 'Baixa';
        status: 'Pendente' | 'Verificado' | 'Descartado';
    }>;
    entities: Array<{            // Pessoas/Vínculos
        name: string;
        role: string;
        context: string;
    }>;
    risks: string[];             // Riscos Operacionais
    hypotheses: Array<{          // Hipóteses
        description: string;
        confidence: 'Alta' | 'Média' | 'Baixa';
        status: 'Ativa' | 'Confirmada' | 'Refutada';
    }>;
    suggestions: string[];       // Sugestões Táticas
    nextSteps: Array<{           // Próximos Passos
        task: string;
        priority: 'Alta' | 'Normal';
        status: 'Pendente' | 'Concluído';
    }>;
    progressLevel: number;       // 0-100%
    lastUpdate: string;          // Timestamp
}
