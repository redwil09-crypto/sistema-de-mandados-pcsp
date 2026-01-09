
/**
 * Geocoding Service using Nominatim (OpenStreetMap)
 */

export interface GeocodingResult {
    lat: number;
    lng: number;
    displayName: string;
}

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
    if (!address || address.trim().length < 5) return null;

    try {
        // Nominatim usage policy requires a User-Agent and a limit of 1 request per second
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                address
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
