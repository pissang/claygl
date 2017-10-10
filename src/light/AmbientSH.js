import Light from '../Light';
import vendor from '../core/vendor';

/**
 * Spherical Harmonic Ambient Light
 * @constructor qtek.light.AmbientSH
 * @extends qtek.Light
 */
var AmbientSHLight = Light.extend({

    castShadow: false,


    /**
     * Spherical Harmonic Coefficients
     * @type {Array.<number>}
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
     * @method
     * @name clone
     * @return {qtek.light.Ambient}
     * @memberOf qtek.light.Ambient.prototype
     */
});

export default AmbientSHLight;
