import request from './request';

var supportWebGL;

var vendor = {};

/**
 * If support WebGL
 * @return {boolean}
 */
vendor.supportWebGL = function () {
    if (supportWebGL == null) {
        try {
            var canvas = document.createElement('canvas');
            var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) {
                throw new Error();
            }
        }
        catch (e) {
            supportWebGL = false;
        }

    }
    return supportWebGL;
};

vendor.Int8Array = typeof Int8Array === 'undefined' ? Array : Int8Array;

vendor.Uint8Array = typeof Uint8Array === 'undefined' ? Array : Uint8Array;

vendor.Uint16Array = typeof Uint16Array === 'undefined' ? Array : Uint16Array;

vendor.Uint32Array = typeof Uint32Array === 'undefined' ? Array : Uint32Array;

vendor.Int16Array = typeof Int16Array === 'undefined' ? Array : Int16Array;

vendor.Float32Array = typeof Float32Array === 'undefined' ? Array : Float32Array;

vendor.Float64Array = typeof Float64Array === 'undefined' ? Array : Float64Array;

var g = {};
if (typeof window !== 'undefined') {
    g = window;
}
else if (typeof global !== 'undefined') {
    g = global;
}


vendor.requestAnimationFrame = g.requestAnimationFrame
    || g.msRequestAnimationFrame
    || g.mozRequestAnimationFrame
    || g.webkitRequestAnimationFrame
    || function (func){ setTimeout(func, 16); };

vendor.createCanvas = function () {
    return document.createElement('canvas');
};

vendor.createImage = function () {
    return new g.Image();
};

vendor.request = {
    get: request.get
};

vendor.addEventListener = function (dom, type, func, useCapture) {
    dom.addEventListener(type, func, useCapture);
};

vendor.removeEventListener = function (dom, type, func) {
    dom.removeEventListener(type, func);
};

export default vendor;
