
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

export const formatDate = (dateString: string | undefined | null) => {
    if (!dateString || dateString === '-' || dateString.trim() === '' || dateString === 'null') return '';
    
    // If it's already DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return dateString;

    // If it's YYYY-MM-DD
    if (dateString.includes('-')) {
        const parts = dateString.split('T')[0].split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            if (year.length === 4) {
                return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
            }
            if (day.length === 4) { // handle DD-MM-YYYY if it exists
                return `${year.padStart(2, '0')}/${month.padStart(2, '0')}/${day}`;
            }
        }
    }

    // Fallback attempt with JS Date
    try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
            return date.toLocaleDateString('pt-BR');
        }
    } catch (e) {
        // ignore
    }

    return dateString;
};

export const maskDate = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Limit to 8 digits
    const limited = digits.substring(0, 8);
    
    // Apply mask DD/MM/YYYY
    if (limited.length <= 2) return limited;
    if (limited.length <= 4) return `${limited.substring(0, 2)}/${limited.substring(2)}`;
    return `${limited.substring(0, 2)}/${limited.substring(2, 4)}/${limited.substring(4)}`;
};

export const addDays = (dateStr: string, days: number): string => {
    if (!dateStr) return '';
    try {
        let date: Date;
        if (dateStr.includes('/')) {
            const [d, m, y] = dateStr.split('/');
            date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        } else {
            date = new Date(dateStr);
        }
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
};
