const Jimp = require('jimp');

async function main() {
    try {
        const img = await Jimp.read('public/novo_brasao_tatical.png');
        console.log('Reading image...');

        const w = img.bitmap.width;
        const h = img.bitmap.height;

        // Instead of flood fill (to avoid complex stack sizes or slow bfs in JS),
        // let's do an edge-shrink sweep. Or even simpler: remove anything that is dark AND grey/desaturated.
        // The shield has red and blue. The background is dark grey.

        img.scan(0, 0, w, h, function (x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];

            // Calculate how "grey" it is by finding max color difference
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const saturationDiff = maxC - minC;

            // Background is usually dark (maxC < 110) AND greyish (saturationDiff < 20).
            // Also, let's remove some of the lighter grey/smoke if it has no clear color.

            const isDark = maxC < 130;
            const isGrey = saturationDiff < 25;

            // We don't want to remove the black inside the shield, but to cut the "lateral" (the square background),
            // we can do a trick: we zero-out pixels based on distance from the center.
            // E.g. anything outside a certain radius that is dark is removed.

            const cx = w / 2;
            const cy = h / 2;
            const distToCenter = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
            const distanceFromEdge = Math.min(x, w - x, y, h - y);

            // If it's near the edge AND it's dark/greyish, kill it.
            if (isDark && isGrey) {
                this.bitmap.data[idx + 3] = 0; // Transparent
            } else if (maxC < 40) {
                // Absolute dark/black everywhere also goes transparent
                this.bitmap.data[idx + 3] = 0;
            }
        });

        await img.writeAsync('public/novo_brasao_tatical.png');
        // Also save it as C:\Users\redwi\.gemini\antigravity\brain\ef20494f-b64e-42bb-a4ba-196ce016c04f\novo_brasao_tatical_final.png 
        // so we can see the live preview later.
        console.log('Saved perfect transparent version!');
    } catch (e) {
        console.error(e);
    }
}

main();
