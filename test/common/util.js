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
        const glImg = document.createElement('canvas');
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

    assertWith(canvas, options, cb) {
        const fixturePath = options.fixture;
        if (process.env.GENERATE_FIXTURE) {
            this.writeGLImage(canvas, fixturePath, function () {
                cb();        
            });
        } else {
            const fixture = fs.readFileSync(fixturePath);
            const actual = this.getGlImage(canvas);
            this._loadImage(fixture, actual, (fixture, actual) => {
                const diff = this.compareImagePixel(fixture, actual, options.delta);
                assert(diff === 0, (diff > 0 ? `Image is different from fixture with delta ${diff}` : 'Image is blank') + `, fixture: ${fixturePath}`);
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
     * @param {Number} colorDelta Max. distance colors in the 4 dimensional color-space without triggering a difference. (default: 20)
     * @return {Number} -1 : blank image, 0: same, > 0 : color delta
     */
    compareImagePixel(fixture, actual, colorDelta) {
        if (fixture.width !== actual.width || fixture.height !== actual.height) {
            return fixture.width * fixture.height;
        }
        colorDelta = colorDelta || 20;
        const w = fixture.width, h = fixture.height;
        const canvas1 = document.createElement('canvas');
        const canvas2 = document.createElement('canvas');
        canvas1.width = canvas2.width = w;
        canvas1.height = canvas2.height = h;
        const ctx1 = canvas1.getContext('2d');
        const ctx2 = canvas2.getContext('2d');

        ctx1.drawImage(fixture, 0, 0);
        ctx2.drawImage(actual, 0, 0);

        const data1 = ctx1.getImageData(0, 0, w, h).data;
        const data2 = ctx2.getImageData(0, 0, w, h).data;
        
        let diff = -1; //blank in default
        let delta = 0;
        for (let i = 0, l = data1.length; i < l; i += 4) {
            if (diff === -1 && data2[i + 3] > 0) {
                diff = 0; //met 1st drawn pixel
            }
            for (let ii = 0; ii < 4; ii++) {
                delta += Math.abs(data1[i + ii] - data2[i + ii]);
            }
        }
        if (delta > colorDelta) {
            return delta;
        }
        return diff;
    }

};
