import Light from '../Light';
import vendor from '../core/vendor';

/**
 * Spherical Harmonic Ambient Light
 * @constructor clay.light.AmbientSH
 * @extends clay.Light
 */
var AmbientSHLight = Light.extend({

    castShadow: false,

    /**
     * Spherical Harmonic Coefficients
     * @type {Array.<number>}
     * @memberOf clay.light.AmbientSH#
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
                var coefficientsTmpArr = instance._coefficientsTmpArr;
                for (var i = 0; i < instance.coefficients.length; i++) {
                    coefficientsTmpArr[i] = instance.coefficients[i];
                }
                return coefficientsTmpArr;
            }
        }
    }
    /**
     * @function
     * @name clone
     * @return {clay.light.Ambient}
     * @memberOf clay.light.Ambient.prototype
     */
});

export default AmbientSHLight;
