define(function (require) {

    'use strict';

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

    var strUndefined = 'undefined';

    vendor.Int8Array = typeof Int8Array == strUndefined ? Array : Int8Array;

    vendor.Uint8Array = typeof Uint8Array == strUndefined ? Array : Uint8Array;

    vendor.Uint16Array = typeof Uint16Array == strUndefined ? Array : Uint16Array;

    vendor.Int16Array = typeof Int16Array == strUndefined ? Array : Int16Array;

    vendor.Float32Array = typeof Float32Array == strUndefined ? Array : Float32Array;

    return vendor;
});