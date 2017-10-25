const glCreateContext = require('gl');
const fs = require('fs');
const { createCanvas, Image } = require('canvas');

/**
* reference:
* https://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
*/
const requestAnimationFrame = function (callback, element) {
    var currTime = Date.now();
    var timeToCall = Math.max(0, 16 - (currTime - lastTime));
    var id = window.setTimeout(function () { callback(currTime + timeToCall); },
        timeToCall);
    lastTime = currTime + timeToCall;
    return id;
};
/**
* 
* @param {*} id 
*/
const cancelAnimationFrame = function (id) {
    clearTimeout(id);
};

const cancelTimeout = cancelAnimationFrame;
/**
* Create a headless canvas instance
* @param {Number} w canvas width
* @param {Number} h canvas height
* @returns {Canvas} a canvas instance
*/
function createHeadlessCanvas(w, h) {
    const canvas = createCanvas(w, h);
    canvas.style = {};
    const originGetContext = canvas.getContext;
    canvas.getContext = function (type, options) {
        if (type === '2d') {
            return originGetContext.call(canvas, '2d');
        } else if (type === 'webgl' || type === 'experimental-webgl') {
            const gl = glCreateContext(w, h, options);
            canvas.gl = gl;
            gl.canvas = canvas;
            return gl;
        }
        throw new Error('unsupported context: ' + type);
    }
    return canvas;
}

/**
* Get image content of the canvas
* @param {Canvas} canvas
* @returns {Buffer} image
*/
function getGlImage(canvas) {
    const gl = canvas.gl,
        width = canvas.width,
        height = canvas.height;
    if (!gl) {
        return null;
    }
    const pixels = new Uint8Array(4 * width * height);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    const clamped = new Uint8ClampedArray(pixels),
        imageData = new Canvas.ImageData(clamped, width, height);
    const img = new Canvas(width, height),
        ctx = img.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    return img.toBuffer();
}

/**
* Write canvas as png image to file at given path
* @param {Canvas} canvas canvas
* @param {String} path file path
* @param {Function} cb callback when finishing or error occuring
*/
function writeGlImage(canvas, path, cb) {
    const img = getGlImage(canvas);
    fs.writeFile(path, img, cb);
}

function mock() {
    if (typeof global.window === 'undefined' || typeof global.document === 'undefined') {

        const window= {
            requestAnimationFrame: requestAnimationFrame,
            cancelAnimationFrame: cancelAnimationFrame,
            setTimeout: setTimeout,
            cancelTimeout: cancelTimeout
        };

        const document = {
            createElement(tagName) {
                if (tagName === 'canvas') {
                    return createHeadlessCanvas(10, 10);
                }
                return null;
            },
            addEventListener : function () {

            }
        };

        global.Image = Image;
        global.window = window;
        global.document = document;
    }
}

mock();

exports.default = {
    getGlImage : getGlImage,
    writeGlImage : writeGlImage  
};
