
import https from 'https';

const apiKey = 'AIzaSyDX9hFIUtSzn2qP5T6Es8zqZmzvhntL5rU';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log(`Checking models at: ${url}`);

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        if (res.statusCode === 200) {
            try {
                const json = JSON.parse(data);
                if (json.models) {
                    console.log("Available Models:");
                    json.models.forEach(m => console.log(` - ${m.name}`));
                } else {
                    console.log("No models found in response.");
                    console.log(data);
                }
            } catch (e) {
                console.error("Error parsing JSON:", e.message);
                console.log("Raw Data:", data);
            }
        } else {
            console.error("Request Failed.");
            console.log("Response:", data);
        }
    });

}).on("error", (err) => {
    console.error("Error: " + err.message);
});
