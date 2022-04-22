// @ts-nocheck
import Light from '../Light';

/**
 * @constructor clay.light.Ambient
 * @extends clay.Light
 */
const AmbientLight = Light.extend(
  {
    castShadow: false
  },
  {
    type: 'AMBIENT_LIGHT',

    uniformTemplates: {
      ambientLightColor: {
        type: '3f',
        value: function (instance) {
          const color = instance.color;
          const intensity = instance.intensity;
          return [color[0] * intensity, color[1] * intensity, color[2] * intensity];
        }
      }
    }
    /**
     * @function
     * @name clone
     * @return {clay.light.Ambient}
     * @memberOf clay.light.Ambient.prototype
     */
  }
);

export default AmbientLight;
