define(function(require) {

    'use strict';

    var Light = require('../Light');
    var vendor = require('../core/vendor');

    /**
     * Spherical Harmonic Ambient Light
     * @constructor qtek.light.AmbientSH
     * @extends qtek.Light
     */
    var AmbientSHLight = Light.derive({

        castShadow: false,


        /**
         * Spherical Harmonic Coefficients
         * @type {Array.<Array.<number>>}
         */
        coefficients: [],

    }, function () {
        this._coefficientsTmpArr = new vendor.Float32Array(9 * 3);
    }, {

        type: 'AMBIENT_SH_LIGHT',

        uniformTemplates: {
            ambientSHLightColor: {
                type: '3f',
                value: function (instance) {
                    var color = instance.color;
                    var intensity = instance.intensity;
                    return [color[0] * intensity, color[1] * intensity, color[2] * intensity];
                }
            },

            ambientSHLightCoefficients: {
                type: '3f',
                value: function (instance) {
                    var coefficients = instance.coefficients;
                    var offset = 0;
                    var coefficientsTmpArr = this._coefficientsTmpArr;
                    for (var i = 0; i < coefficients.length; i++) {
                        coefficientsTmpArr[offset++] = coefficients[i][0];
                        coefficientsTmpArr[offset++] = coefficients[i][1];
                        coefficientsTmpArr[offset++] = coefficients[i][2];
                    }
                }
            }
        }
        /**
         * @method
         * @name clone
         * @return {qtek.light.Ambient}
         * @memberOf qtek.light.Ambient.prototype
         */
    });

    return AmbientSHLight;
});