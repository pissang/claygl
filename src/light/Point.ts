// @ts-nocheck
import Light from '../Light';

/**
 * @constructor clay.light.Point
 * @extends clay.Light
 */
const PointLight = Light.extend(
  /** @lends clay.light.Point# */ {
    /**
     * @type {number}
     */
    range: 100,

    /**
     * @type {number}
     */
    castShadow: false
  },
  {
    type: 'POINT_LIGHT',

    uniformTemplates: {
      pointLightPosition: {
        type: '3f',
        value: function (instance) {
          return instance.getWorldPosition().array;
        }
      },
      pointLightRange: {
        type: '1f',
        value: function (instance) {
          return instance.range;
        }
      },
      pointLightColor: {
        type: '3f',
        value: function (instance) {
          const color = instance.color;
          const intensity = instance.intensity;
          return [color[0] * intensity, color[1] * intensity, color[2] * intensity];
        }
      }
    },
    /**
     * @return {clay.light.Point}
     * @memberOf clay.light.Point.prototype
     */
    clone: function () {
      const light = Light.prototype.clone.call(this);
      light.range = this.range;
      return light;
    }
  }
);

export default PointLight;
