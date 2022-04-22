// @ts-nocheck
import Light from '../Light';
import Vector3 from '../math/Vector3';

/**
 * @constructor clay.light.Tube
 * @extends {clay.Light}
 */
const TubeLight = Light.extend(
  /** @lends clay.light.Tube# */
  {
    /**
     * @type {number}
     */
    range: 100,

    /**
     * @type {number}
     */
    length: 10
  },
  {
    type: 'TUBE_LIGHT',

    uniformTemplates: {
      tubeLightPosition: {
        type: '3f',
        value: function (instance) {
          return instance.getWorldPosition().array;
        }
      },

      tubeLightExtend: {
        type: '3f',
        value: (function () {
          const x = new Vector3();
          return function (instance) {
            // Extend in x axis
            return x
              .copy(instance.worldTransform.x)
              .normalize()
              .scale(instance.length / 2).array;
          };
        })()
      },

      tubeLightRange: {
        type: '1f',
        value: function (instance) {
          return instance.range;
        }
      },

      tubeLightColor: {
        type: '3f',
        value: function (instance) {
          const color = instance.color;
          const intensity = instance.intensity;
          return [color[0] * intensity, color[1] * intensity, color[2] * intensity];
        }
      }
    }
  }
);

export default TubeLight;
