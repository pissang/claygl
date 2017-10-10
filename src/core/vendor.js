var supportWebGL = true;
try {
    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        throw new Error();
    }
} catch (e) {
    supportWebGL = false;
}

var vendor = {};

/**
 * If support WebGL
 * @return {boolean}
 */
vendor.supportWebGL = function () {
    return supportWebGL;
};


vendor.Int8Array = typeof Int8Array == 'undefined' ? Array : Int8Array;

vendor.Uint8Array = typeof Uint8Array == 'undefined' ? Array : Uint8Array;

vendor.Uint16Array = typeof Uint16Array == 'undefined' ? Array : Uint16Array;

vendor.Uint32Array = typeof Uint32Array == 'undefined' ? Array : Uint32Array;

vendor.Int16Array = typeof Int16Array == 'undefined' ? Array : Int16Array;

vendor.Float32Array = typeof Float32Array == 'undefined' ? Array : Float32Array;

vendor.Float64Array = typeof Float64Array == 'undefined' ? Array : Float64Array;

export default vendor;
