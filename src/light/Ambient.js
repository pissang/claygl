import Light from '../Light';
import colorUtil from '../core/color';
var parseColor = colorUtil.parseToFloat;

/**
 * @constructor clay.light.Ambient
 * @param {Color} [color='#fff'] Optional color of ambient light, default white.
 * @param {number} [intensity=1] Optional intensity of ambient light, default 1.
 * @extends clay.Light
 */
var AmbientLight = Light.extend({

    castShadow: false

}, function(color, intensity)  {
  if (typeof color === 'string') {
      color = parseColor(color);
      this.color = color;
  }

  if (typeof intensity === 'number') {
      this.intensity = intensity;
  }
},{

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
