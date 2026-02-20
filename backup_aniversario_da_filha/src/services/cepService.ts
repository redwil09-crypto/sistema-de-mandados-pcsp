
/**
 * CEP Service using ViaCEP API
 */

export interface ViaCepResponse {
    cep: string;
    logradouro: string;
    complemento: string;
    bairro: string;
    localidade: string;
    uf: string;
    ibge: string;
    gia: string;
    ddd: string;
    siafi: string;
    erro?: boolean;
}

export interface AddressData {
    logradouro: string;
    bairro: string;
    cidade: string;
    uf: string;
    fullAddress: string;
}

export async function fetchAddressByCep(cep: string): Promise<AddressData | null> {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) return null;

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        
        if (!response.ok) {
            throw new Error('Erro na resposta do serviço de CEP');
        }

        const data: ViaCepResponse = await response.json();

        if (data.erro) {
            return null;
        }

        const fullAddress = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;

        return {
            logradouro: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            uf: data.uf,
            fullAddress
        };
    } catch (error) {
        console.error('CEP lookup error:', error);
        return null;
    }
}
