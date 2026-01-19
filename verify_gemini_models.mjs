
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';

const API_KEY = "AIzaSyDX9hFIUtSzn2qP5T6Es8zqZmzvhntL5rU";
const genAI = new GoogleGenerativeAI(API_KEY);

const models = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-1.5-pro-001",
    "gemini-1.5-pro-latest",
    "gemini-1.0-pro",
    "gemini-pro"
];

async function testModels() {
    let report = "GEMINI DIAGNOSTIC REPORT\n========================\n";

    for (const modelName of models) {
        report += `\nTesting model: ${modelName}\n`;
        console.log(`Testing ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say 'OK'");
            const response = await result.response;
            const text = response.text();

            report += `STATUS: SUCCESS\nRESPONSE: ${text}\n`;
            console.log(`SUCCESS: ${modelName}`);
        } catch (error) {
            report += `STATUS: FAILED\nERROR: ${error.message}\n`;
            console.log(`FAILED: ${modelName} - ${error.message}`);
        }
    }

    fs.writeFileSync('gemini_diagnostic_report.txt', report);
    console.log("Report saved to gemini_diagnostic_report.txt");
}

testModels();
