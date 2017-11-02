const fs = require('fs');
const nativeImage = require('electron').nativeImage;
const assert = require('assert');

module.exports = {
    /**
    * Get image content of the canvas
    * @param {Canvas} canvas
    * @returns {Buffer} image
    */
    getGlImage(canvas) {
        const gl = canvas.gl,
        width = canvas.width,
        height = canvas.height;
        if (!gl) {
            return null;
        }
        const pixels = new Uint8Array(4 * width * height);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        const clamped = new Uint8ClampedArray(pixels),
            imageData = new ImageData(clamped, width, height);
        const img = document.createElement('canvas');
        img.width = width;
        img.height = height;
        const ctx = img.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
        const data = img.toDataURL('image/png');
        const buf = nativeImage.createFromDataURL(data).toPng();
        return buf;
    }, 

    /**
    * Write canvas as png image to file at given path
    * @param {Canvas} canvas canvas
    * @param {String} path file path
    * @param {Function} cb callback when finishing or error occuring
    */
    writeGLImage(canvas, path, cb) {
        const buf = this.getGlImage(canvas);
        fs.writeFile(path, buf, cb);
    },

    assertWith(canvas, filePath, cb) {        
        if (process.env.GENERATE_FIXTURE) {
            this.writeGLImage(canvas, filePath, function () {
                cb();        
            });
        } else {
            const expected = fs.readFileSync(filePath);
            const actual = this.getGlImage(canvas);
            assert.deepEqual(expected, actual, filePath);
            cb();
        }
    }
};
