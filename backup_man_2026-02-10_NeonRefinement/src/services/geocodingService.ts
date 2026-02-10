
/**
 * Geocoding Service using Nominatim (OpenStreetMap)
 */

export interface GeocodingResult {
    lat: number;
    lng: number;
    displayName: string;
}

function cleanAddress(address: string): string {
    return address
        .replace(/\b(MANDADO DE PRISÃO|BUSCA E APREENSÃO|PROC\.|VARA|FORUM|COMARCA)\b/gi, '')
        .replace(/ - \d+.*$/, '') // Remove everything after a dash that looks like a description
        .replace(/\s+/g, ' ')
        .trim();
}

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
    if (!address || address.trim().length < 5) return null;

    const query = cleanAddress(address);

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                query
            )}&limit=1`,
            {
                headers: {
                    'Accept-Language': 'pt-BR',
                    'User-Agent': 'SistemaMandadosPCSP/1.0'
                }
            }
        );

        if (!response.ok) {
            throw new Error('Erro na resposta do serviço de geocodificação');
        }

        const data = await response.json();

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                displayName: data[0].display_name
            };
        }

        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

export async function fetchAddressSuggestions(query: string): Promise<GeocodingResult[]> {
    if (!query || query.trim().length < 3) return [];

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                query
            )}&limit=5&countrycodes=br`,
            {
                headers: {
                    'Accept-Language': 'pt-BR',
                    'User-Agent': 'SistemaMandadosPCSP/1.0'
                }
            }
        );

        if (!response.ok) return [];

        const data = await response.json();

        return data.map((item: any) => ({
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            displayName: item.display_name
        }));
    } catch (error) {
        console.error('Fetch suggestions error:', error);
        return [];
    }
}
