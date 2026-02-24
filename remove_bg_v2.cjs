const Jimp = require('jimp');

async function removeWhiteBackground() {
    console.log("Reading image...");
    try {
        const image = await Jimp.read('public/brasao_olho_16_neon.png');
        const width = image.bitmap.width;
        const height = image.bitmap.height;
        let removedPixels = 0;

        console.log(`Processing pixels... (${width}x${height})`);
        image.scan(0, 0, width, height, function (x, y, idx) {
            const red = this.bitmap.data[idx + 0];
            const green = this.bitmap.data[idx + 1];
            const blue = this.bitmap.data[idx + 2];
            const alpha = this.bitmap.data[idx + 3];

            if (alpha > 0) {
                // White background: if R, G, B are all high, make it transparent
                // Also handle a bit of anti-aliasing (edges)
                if (red > 240 && green > 240 && blue > 240) {
                    this.bitmap.data[idx + 3] = 0;
                    removedPixels++;
                } else if (red > 180 && green > 180 && blue > 180 &&
                    Math.abs(red - green) < 15 && Math.abs(green - blue) < 15) {
                    // Grey-ish/white transition edge pixels, reduce opacity proportional to whiteness
                    const avg = (red + green + blue) / 3;
                    const newAlpha = Math.max(0, Math.floor(((255 - avg) / 75) * 255));
                    this.bitmap.data[idx + 3] = newAlpha < alpha ? newAlpha : alpha;
                    if (newAlpha < 255) removedPixels++;
                }
            }
        });

        console.log(`Writing image to public/brasao_olho_16_neon.png... Removed approx ${removedPixels} white pixels.`);
        await image.writeAsync('public/brasao_olho_16_neon.png');
        console.log("Done.");
    } catch (err) {
        console.error("Error processing image: ", err);
    }
}

removeWhiteBackground();
