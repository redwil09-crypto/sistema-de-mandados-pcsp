
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyDX9hFIUtSzn2qP5T6Es8zqZmzvhntL5rU";

async function listModels() {
    try {
        console.log("Listando modelos disponíveis...");
        const genAI = new GoogleGenerativeAI(API_KEY);
        // Note: listModels is not directly on genAI instance usually, it's a bit more complex in REST but the SDK might expose it via getModel or similar, 
        // actually SDK doesn't have a simple 'listModels' helper directly on the root usually without creating a model manager or similar, 
        // but let's try a simple generation with "gemini-pro" which is the safest fallback.

        // Let's try 'gemini-1.5-pro-latest' or just 'gemini-pro'
        console.log("Tentando 'gemini-pro'...");
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Test");
        console.log("Gemini Pro: OK");

        console.log("Tentando 'gemini-1.5-flash-001'...");
        const model2 = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });
        const result2 = await model2.generateContent("Test");
        console.log("Gemini 1.5 Flash 001: OK");

    } catch (error) {
        console.error("ERRO:", error.message);
    }
}

listModels();
