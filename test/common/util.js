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
            const fixture = fs.readFileSync(filePath);
            const actual = this.getGlImage(canvas);
            this._loadImage(fixture, actual, (fixture, actual) => {
                const ret = this.compareImagePixel(fixture, actual);
                assert(ret === 1, (ret === -1 ? 'Image is different from fixture' : 'Image is blank') + `: ${filePath}`);
                cb();
            });
        }
    },

    _loadImage(fixture, actual, cb) {
        const img1 = nativeImage.createFromBuffer(fixture);
        const img2 = nativeImage.createFromBuffer(actual);

        const webImg1 = new Image();
        const webImg2 = new Image();
        webImg1.onload = onload;
        webImg2.onload = onload;
        function onload() {
            this.finished = true;
            if (webImg1.finished && webImg2.finished) {
                cb(webImg1, webImg2);
            }
        }
        webImg1.src = img1.toDataURL();
        webImg2.src = img2.toDataURL();
    },

    /**
     * Compare image pixel difference
     * @param {Buffer} fixture
     * @param {Buffer} actual
     * @param {Number} colorDelta max distance of RGB value
     * @return {Number} -1 : different, 0: blank image, 1 : same
     */
    compareImagePixel(fixture, actual, colorDelta = 2) {
        if (fixture.width !== actual.width || fixture.height !== actual.height) {
            return -1;
        }
        const w = fixture.width, h = fixture.height;
        canvas1.width = canvas2.width = w;
        canvas1.height = canvas2.height = h;
        const ctx1 = canvas1.getContext('2d');
        const ctx2 = canvas2.getContext('2d');

        ctx1.drawImage(fixture, 0, 0);
        ctx2.drawImage(actual, 0, 0);

        const data1 = ctx1.getImageData(0, 0, w, h).data;
        const data2 = ctx2.getImageData(0, 0, w, h).data;
        
        let drawn = 0;        
        for (let i = 0, l = data1.length; i < l; i += 4) {
            if (!drawn && data2[i + 3] > 0) {
                drawn = 1;
            }
            if (!compare(data1[i], data2[i], colorDelta) ||
                !compare(data1[i + 1], data2[i + 1], colorDelta) ||
                !compare(data1[i + 2], data2[i + 2], colorDelta) ||
                data1[i + 3] !== data2[i + 3]) {
                return false;
            }
        }
        return drawn;
    }

};

function compare(c1, c2, delta) {
    const c = c1 - c2;
    return c <= delta && c >= -delta;
}
