const Jimp = require('jimp');

async function processImage() {
    try {
        const image = await Jimp.read('public/novo_brasao_tatical.png');
        // Simple flood kill of purely white pixels
        const w = image.bitmap.width;
        const h = image.bitmap.height;

        // Start from corners, make every contiguous white pixel transparent using simple BFS (in JS)
        // Actually, just thresholding pure white is safer and simpler for vectors.
        image.scan(0, 0, w, h, function (x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];

            // If it's pure white (or very close), make it transparent
            if (r >= 253 && g >= 253 && b >= 253) {
                this.bitmap.data[idx + 3] = 0; // Transparent
            }
        });

        await image.writeAsync('public/novo_brasao_tatical.png');
        console.log('Background removed!');
    } catch (e) {
        console.error(e);
    }
}
processImage();
