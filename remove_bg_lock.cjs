const Jimp = require('jimp');

async function removeWhiteBackground() {
    const fileName = 'public/novo_brasao_lock.png';
    console.log(`Reading image ${fileName}...`);
    try {
        const image = await Jimp.read(fileName);
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
                // White background: if R, G, B are all very high
                if (red > 250 && green > 250 && blue > 250) {
                    this.bitmap.data[idx + 3] = 0;
                    removedPixels++;
                } else if (red > 230 && green > 230 && blue > 230) {
                    // Smooth edges
                    this.bitmap.data[idx + 3] = 0;
                    removedPixels++;
                }
            }
        });

        console.log(`Writing image back... Removed approx ${removedPixels} white pixels.`);
        await image.writeAsync(fileName);
        console.log("Done.");
    } catch (err) {
        console.error("Error processing image: ", err);
    }
}

removeWhiteBackground();
