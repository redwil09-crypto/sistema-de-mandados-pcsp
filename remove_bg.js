const Jimp = require('jimp');

async function removeWhiteBackground() {
    console.log("Reading image...");
    try {
        const image = await Jimp.read('public/brasao_olho_16_neon.png');

        console.log("Processing pixels...");
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            const red = this.bitmap.data[idx + 0];
            const green = this.bitmap.data[idx + 1];
            const blue = this.bitmap.data[idx + 2];

            // Define tolerance for white (e.g. > 230)
            if (red > 220 && green > 220 && blue > 220) {
                // If it's pure white or very light gray, remove it
                this.bitmap.data[idx + 3] = 0; // alpha to 0
            }
        });

        console.log("Writing image to public/brasao_olho_16_neon.png...");
        await image.writeAsync('public/brasao_olho_16_neon.png');
        console.log("Done.");
    } catch (err) {
        console.error("Error processing image: ", err);
    }
}

removeWhiteBackground();
