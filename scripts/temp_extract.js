import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const genAI = new GoogleGenerativeAI('AIzaSyAy4egv1X54dvbM7wtWI9xvAkHPTpa8NOM');

function fileToGenerativePart(filePath, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
            mimeType
        },
    };
}

async function run() {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const baseDir = "C:\\Users\\Policial\\.gemini\\antigravity\\brain\\6dfc66a9-59dc-4b55-a666-4a504451b75d";
    const imageFiles = [
        "media__1772213638238.png",
        "media__1772213644443.png",
        "media__1772213652170.png",
        "media__1772213662414.png"
    ];

    const imageParts = imageFiles.map(img => fileToGenerativePart(path.join(baseDir, img), "image/png"));

    const prompt = "Analise as 4 imagens fornecidas. Cada imagem parece representar uma lista de bairros ou área de atuação de uma delegacia específica (1º DP, 2º DP, 3º DP, 4º DP) de Jacareí ou outra localidade pertinente. Por favor, extraia exatamente qual é a lista de bairros ou regras territoriais de cada DP e retorne em um formato JSON claro: { '1DP': ['bairro1', 'bairro2'], '2DP': [...], ... }.";

    try {
        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const text = response.text();
        console.log(text);
    } catch (error) {
        console.error("Error calling Gemini:");
        console.error(error);
    }
}

run();
