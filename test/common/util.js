const fs = require('fs');
const nativeImage = require('electron').nativeImage;
const assert = require('assert');

const canvas1 = document.createElement('canvas');
const canvas2 = document.createElement('canvas');
const glImg = document.createElement('canvas');

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
        glImg.width = width;
        glImg.height = height;
        const ctx = glImg.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
        const data = glImg.toDataURL('image/png');
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
            assert(this.compareImagePixel(expected, actual), filePath);
            cb();
        }
    },

    compareImagePixel(buf1, buf2) {
        const img1 = nativeImage.createFromBuffer(buf1);
        const img2 = nativeImage.createFromBuffer(buf2);
        const size1 = img1.getSize(),
            size2 = img2.getSize();
        if (size1.width !== size2.width || size1.height !== size2.height) {
            return false;
        }

        const w = size1.width, h = size1.height;

        const webImg1 = new Image();
        webImg1.src = img1.toDataURL();

        const webImg2 = new Image();
        webImg2.src = img2.toDataURL();

        canvas1.width = canvas2.width = w;
        canvas1.height = canvas2.height = h;
        const ctx1 = canvas1.getContext('2d');
        const ctx2 = canvas2.getContext('2d');

        ctx1.drawImage(webImg1, 0, 0);
        ctx2.drawImage(webImg2, 0, 0);

        const data1 = ctx1.getImageData(0, 0, w, h).data;
        const data2 = ctx2.getImageData(0, 0, w, h).data;
        
        for (let i = 0, l = data1.length; i < l; i += 4) {
            if (data1[i] !== data2[i] || data1[i + 1] !== data2[i + 1] || data1[i + 2] !== data2[i + 2] || data1[i + 3] !== data2[i + 3]) {
                return false;
            }
        }
        return true;
    }

};
