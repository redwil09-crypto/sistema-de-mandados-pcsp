
import { Warrant, ChartData } from '../types';

export const MOCK_WARRANTS: (Warrant & { date: string })[] = [
    {
        id: "1",
        img: "https://picsum.photos/id/64/200/200",
        name: "João da Silva Sauro",
        type: "Prisão Preventiva",
        location: "Rua Augusta, 500 - São Paulo",
        number: "123456-78.2023.8.26.0001",
        status: "EM ABERTO",
        rg: "12.345.678-9",
        cpf: "123.456.789-00",
        description: "Homicídio qualificado e ocultação de cadáver",
        date: "2023-05-15",
        crime: "Homicídio",
        regime: "Preventiva",
        observation: "Indivíduo perigoso, possui tatuagem no braço direito. Pode estar armado. Frequentador de bares na região central.",
        issueDate: "10/05/2023",
        entryDate: "12/05/2023",
        expirationDate: "10/05/2033",
        dischargeDate: "-",
        ifoodNumber: "OF-IFOOD-2023/99",
        ifoodResult: "Positivo - Último pedido em 14/05/2023 no endereço cadastrado.",
        digOffice: "DIG-Norte-001/24",
        reports: ["Relatório de Inteligência 01", "Dossiê Fotográfico", "Levantamento de Campo"],
        attachments: ["Mandado_Assinado.pdf", "Foto_Suspeito_Recente.jpg"]
    },
    {
        id: "2",
        img: "https://picsum.photos/id/65/200/200",
        name: "Maria Oliveira Costa",
        type: "Busca e Apreensão",
        location: "Av. Paulista, 1000 - Guarulhos",
        number: "987654-32.2023.8.26.0050",
        status: "CUMPRIDO",
        rg: "98.765.432-1",
        cpf: "987.654.321-11",
        description: "Tráfico de entorpecentes e associação criminosa",
        date: "2023-08-20",
        crime: "Drogas/Trafico",
        regime: "Fechado",
        observation: "Endereço confirmado pela inteligência. Cuidado com cães no local.",
        issueDate: "15/08/2023",
        entryDate: "16/08/2023",
        expirationDate: "15/08/2025",
        dischargeDate: "21/08/2023",
        ifoodNumber: "OF-IFOOD-2023/102",
        ifoodResult: "Negativo",
        digOffice: "DIG-Centro-055/23",
        reports: ["Relatório de Cumprimento", "Auto de Apreensão"],
        attachments: ["Laudo_Drogas.pdf"]
    },
    {
        id: "3",
        img: "https://picsum.photos/id/91/200/200",
        name: "Carlos Pereira Lima",
        type: "Prisão Temporária",
        location: "Rua das Flores, 123 - Campinas",
        number: "246810-12.2023.8.26.0020",
        status: "EM ABERTO",
        rg: "44.555.666-X",
        description: "Roubo majorado pelo emprego de arma de fogo",
        date: "2023-11-10",
        crime: "Roubo",
        regime: "Temporária",
        observation: "Participação em assalto a banco. Veículo de fuga: HB20 Prata."
    },
    {
        id: "4",
        img: null,
        name: "Ana Beatriz Santos",
        type: "Busca e Apreensão",
        location: "Osasco, Centro",
        number: "135791-13.2023.8.26.0100",
        status: "CANCELADO",
        rg: "22.333.444-5",
        description: "Estelionato e fraude bancária",
        date: "2024-01-05",
        crime: "Estelionato",
        regime: "Aberto",
        observation: "Fraude via PIX e Clonagem de WhatsApp."
    },
    {
        id: "5",
        img: null,
        name: "Roberto 'Beto' Almeida",
        type: "Prisão Civil",
        location: "Zona Leste",
        number: "555444-11.2023.8.26.0005",
        status: "EM ABERTO",
        rg: "11.222.333-4",
        description: "Atraso no pagamento de pensão",
        date: "2024-02-10",
        crime: "Pensão alimenticia",
        regime: "Civil",
        observation: "Deve 3 meses de pensão. Trabalha em oficina mecânica."
    }
];

export const RECENT_ACTIVITY_MOCK: Warrant[] = [
    { id: "r1", name: "Marcos Vinicius 'Viper'", type: "Prisão Temporária", status: "PRESO", timestamp: "Há 1 hora", number: "123.456", img: "https://picsum.photos/id/1012/200/200", location: "Zona Sul" },
    { id: "r2", name: "Rua das Palmeiras, 40", type: "Busca Domiciliar", status: "NEGATIVO", timestamp: "Há 2 horas", number: "BA-9988", img: null, location: "Centro" },
    { id: "r3", name: "Juliana Mendes", type: "Prisão Civil", status: "ENCAMINHADO", timestamp: "Há 3 horas", number: "CIV-2211", img: "https://picsum.photos/id/1027/200/200", location: "Zona Oeste" },
    { id: "r4", name: "Pedro 'Facão'", type: "Preventiva", status: "CONTRAMANDADO", timestamp: "Há 5 horas", number: "PRE-7766", img: "https://picsum.photos/id/1005/200/200" },
    { id: "r5", name: "Banco Central Sul", type: "Ofício", status: "OFÍCIO CUMPRIDO", timestamp: "Há 6 horas", number: "OF-1122", img: null },
    { id: "r6", name: "Roberto Justo", type: "Prisão", status: "ÓBITO", timestamp: "Ontem", number: "PRE-0011", img: null },
    { id: "r7", name: "Veículo FOX Prata", type: "Busca e Apreensão", status: "LOCALIZADO", timestamp: "Ontem", number: "BA-3344", img: null },
    { id: "r8", name: "Lucas 'Sombra'", type: "Recaptura", status: "PRESO", timestamp: "Ontem", number: "REC-5544", img: "https://picsum.photos/id/338/200/200" },
    { id: "r9", name: "Av. Industrial, 200", type: "Busca", status: "NEGATIVO", timestamp: "Ontem", number: "BA-8877", img: null },
    { id: "r10", name: "Fernanda Lima", type: "Civil", status: "ENCAMINHADO", timestamp: "2 dias atrás", number: "CIV-9900", img: "https://picsum.photos/id/237/200/200" }
];

export const MINOR_WARRANTS: (Warrant & { date: string })[] = [
    {
        id: "m1",
        img: "https://picsum.photos/id/1005/200/200",
        name: "João da Silva Pereira",
        type: "Apreensão",
        number: "2024.123456-7",
        status: "EM ABERTO",
        age: "17 anos (05/03/2007)",
        priority: "Urgente",
        rg: "55.666.777-8",
        description: "Ato infracional análogo a latrocínio",
        crime: "Ato Infracional / Latrocínio",
        date: "2024-02-28",
        reports: ["Relatório Social"],
        attachments: ["Mandado_Menor.pdf"]
    },
    {
        id: "m2",
        img: "https://picsum.photos/id/338/200/200",
        name: "Maria Oliveira Souza",
        type: "Apreensão",
        number: "2024.987654-3",
        status: "EM ABERTO",
        age: "16 anos (12/08/2008)",
        priority: "Atenção",
        rg: "66.777.888-9",
        description: "Ato infracional análogo a tráfico",
        crime: "Ato Infracional / Tráfico",
        date: "2024-03-01"
    }
];

export const DUTY_WARRANTS: (Warrant & { tags: string[] })[] = [
    {
        id: "d1",
        name: "Marcos 'Vulto' Rocha",
        type: "Prisão Temporária",
        number: "PRO-2024/0055",
        status: "EM ABERTO",
        location: "Jd. Ângela, ZS",
        img: "https://picsum.photos/id/237/200/200",
        priority: "Altíssima",
        tags: ["Urgente", "Risco de Fuga"]
    },
    {
        id: "d2",
        name: "Empresa Fake Tech Ltda",
        type: "Busca e Apreensão",
        number: "BA-2024/0089",
        status: "EM ABERTO",
        location: "Centro Comercial Alpha",
        img: null,
        description: "Apreensão de HDs e Documentos",
        tags: ["Ofício de Cobrança", "Urgente"]
    },
    {
        id: "d3",
        name: "Paulo 'Cicatriz' Mendes",
        type: "Prisão Preventiva",
        number: "PRE-2024/0102",
        status: "EM ABERTO",
        location: "Vila Madalena",
        img: "https://picsum.photos/id/1025/200/200",
        tags: ["Urgente", "Violento"]
    },
    {
        id: "d4",
        name: "Galpão Clandestino",
        type: "Busca e Apreensão",
        number: "BA-2024/0115",
        status: "EM ABERTO",
        location: "Zona Industrial",
        img: null,
        tags: ["Ofício de Cobrança"]
    }
];

export const EXPIRING_WARRANTS = [
    { id: 'e1', name: 'Roberto Santos Gomes', type: 'Prisão Civil', daysLeft: 5, date: '25/06/2024' },
    { id: 'e2', name: 'Julia Lima (Busca)', type: 'Busca e Apreensão', daysLeft: 7, date: '27/06/2024' },
    { id: 'e3', name: 'Carlos Eduardo', type: 'Prisão Preventiva', daysLeft: 10, date: '30/06/2024' },
    { id: 'e4', name: 'Ana Pereira', type: 'Busca Domiciliar', daysLeft: 12, date: '02/07/2024' },
    { id: 'e5', name: 'Marcos Souza', type: 'Prisão Temporária', daysLeft: 15, date: '05/07/2024' },
    { id: 'e6', name: 'Paulo Ricardo', type: 'Ofício', daysLeft: 18, date: '08/07/2024' },
    { id: 'e7', name: 'Fernanda Alves', type: 'Busca e Apreensão', daysLeft: 20, date: '10/07/2024' },
    { id: 'e8', name: 'Lucas Mendes', type: 'Prisão Civil', daysLeft: 22, date: '12/07/2024' },
    { id: 'e9', name: 'Pedro Henrique', type: 'Preventiva', daysLeft: 25, date: '15/07/2024' },
    { id: 'e10', name: 'Maria Clara', type: 'Busca', daysLeft: 28, date: '18/07/2024' },
    { id: 'e11', name: 'João Vitor', type: 'Temporária', daysLeft: 30, date: '20/07/2024' },
    { id: 'e12', name: 'Carla Dias', type: 'Civil', daysLeft: 35, date: '25/07/2024' }
];

export const ANNUAL_EVOLUTION_DATA: ChartData[] = [
    { name: 'Jan', emitted: 120, completed: 85 },
    { name: 'Fev', emitted: 132, completed: 98 },
    { name: 'Mar', emitted: 101, completed: 110 },
    { name: 'Abr', emitted: 134, completed: 120 },
    { name: 'Mai', emitted: 90, completed: 70 },
    { name: 'Jun', emitted: 230, completed: 190 },
    { name: 'Jul', emitted: 210, completed: 180 },
    { name: 'Ago', emitted: 180, completed: 160 },
    { name: 'Set', emitted: 150, completed: 140 },
    { name: 'Out', emitted: 190, completed: 170 },
    { name: 'Nov', emitted: 210, completed: 200 },
    { name: 'Dez', emitted: 140, completed: 130 },
];

export const STATUS_DISTRIBUTION: ChartData[] = [
    { name: 'Ativos', value: 340, color: '#137fec' },
    { name: 'Cumpridos', value: 1250, color: '#388E3C' },
    { name: 'Vencidos', value: 45, color: '#D32F2F' },
    { name: 'Cancelados', value: 80, color: '#FFA000' },
];
