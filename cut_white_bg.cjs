const Jimp = require('jimp');

async function main() {
    try {
        const img = await Jimp.read('public/novo_brasao_tatical.png');
        const w = img.bitmap.width;
        const h = img.bitmap.height;

        // Scanner agressivo TOTAL para eliminar brancos e cinzas de anti-aliasing em TUDO
        img.scan(0, 0, w, h, function (x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];

            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);

            // Verifica se é um tom de fundo/linha de sujeira branca ou cinza
            const isWhiteish = maxC > 180 && (maxC - minC < 35);
            const isGreyish = maxC > 100 && (maxC - minC < 25);

            // Obrasão tem neons VERMELHOS E METAIS ESCUROS. Então se é cinza/branco e NAO é vermelho, deletamos.
            const isRedNeon = r > 120 && r > (g + 40) && r > (b + 40);

            // Se for as beiradas da imagem quadrada (fundo) a gente deleta imediatamente
            if (!isRedNeon && (isWhiteish || isGreyish)) {
                this.bitmap.data[idx + 3] = 0; // Transparente 100%
            }
        });

        await img.writeAsync('public/novo_brasao_tatical.png');
        // Salva cópia na sua galeria da IA para vermos
        await img.writeAsync('C:\\Users\\redwi\\.gemini\\antigravity\\brain\\ef20494f-b64e-42bb-a4ba-196ce016c04f\\olho_recortado_limpo.png');
        console.log('Fundo branco removido de forma agressiva!');
    } catch (err) {
        console.error('Erro no JIMP:', err.message);
    }
}

main();
