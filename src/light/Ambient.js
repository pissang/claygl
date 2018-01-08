import Light from '../Light';

/**
 * @constructor clay.light.Ambient
 * @extends clay.Light
 */
var AmbientLight = Light.extend({

    castShadow: false

}, {

    type: 'AMBIENT_LIGHT',

    uniformTemplates: {
        ambientLightColor: {
            type: '3f',
            value: function(instance) {
                var color = instance.color;
                var intensity = instance.intensity;
                return [color[0]*intensity, color[1]*intensity, color[2]*intensity];
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

export default AmbientLight;
