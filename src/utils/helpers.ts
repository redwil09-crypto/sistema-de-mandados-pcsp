
export const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
        case 'PRESO':
        case 'LOCALIZADO':
        case 'OFÍCIO CUMPRIDO':
            return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        case 'NEGATIVO':
        case 'ÓBITO':
            return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
        case 'CONTRAMANDADO':
            return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
        case 'ENCAMINHADO':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        default:
            return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    }
};

export const formatDate = (dateString: string) => {
    if (!dateString) return '';
    if (dateString.includes('/')) return dateString;
    const [year, month, day] = dateString.split('-');
    if (!day) return dateString;
    return `${day}/${month}/${year}`;
};

export const addDays = (dateStr: string, days: number): string => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
};
