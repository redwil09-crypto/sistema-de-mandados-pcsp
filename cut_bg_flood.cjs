const Jimp = require('jimp');

async function main() {
    try {
        const img = await Jimp.read('public/novo_brasao_tatical.png');
        const w = img.bitmap.width;
        const h = img.bitmap.height;

        // Create visited map
        const visited = new Uint8Array(w * h);
        const queue = [];

        // Enqueue edges
        for (let x = 0; x < w; x++) { queue.push({ x, y: 0 }); queue.push({ x, y: h - 1 }); }
        for (let y = 0; y < h; y++) { queue.push({ x: 0, y }); queue.push({ x: w - 1, y }); }

        let head = 0;
        while (head < queue.length) {
            const { x, y } = queue[head++];
            if (x < 0 || x >= w || y < 0 || y >= h) continue;

            const idx = y * w + x;
            if (visited[idx]) continue;
            visited[idx] = 1;

            const px = idx * 4;
            const r = img.bitmap.data[px + 0];
            const g = img.bitmap.data[px + 1];
            const b = img.bitmap.data[px + 2];

            // Is it a background color?
            // Background is dark/grey. Not red, not blue.
            const isRed = r > 100 && r > g * 1.5 && r > b * 1.5;
            const isBlue = b > 100 && b > r * 1.5 && b > g * 1.5;
            const isCyan = b > 100 && g > 100 && b > r * 1.5;

            const isNeonColor = isRed || isBlue || isCyan;

            // Also stop if it's very bright white/grey
            const maxC = Math.max(r, g, b);
            const isBright = maxC > 180;

            // We fill (erase) everything that is not pure neon / not bright shape
            if (!isNeonColor && !isBright) {
                img.bitmap.data[px + 3] = 0; // Transparent

                queue.push({ x: x + 1, y });
                queue.push({ x: x - 1, y });
                queue.push({ x, y: y + 1 });
                queue.push({ x, y: y - 1 });
            }
        }

        await img.writeAsync('public/novo_brasao_tatical.png');
        await img.writeAsync('C:\\Users\\redwi\\.gemini\\antigravity\\brain\\ef20494f-b64e-42bb-a4ba-196ce016c04f\\novo_brasao_tatical_final.png');

        console.log('Saved transparent version logic 2!');
    } catch (e) {
        console.error(e);
    }
}

main();
