import Light from '../Light';

/**
 * @constructor qtek.light.Point
 * @extends qtek.Light
 */
var PointLight = Light.extend(
/** @lends qtek.light.Point# */
{
    /**
     * @type {number}
     */
    range: 100,

    /**
     * @type {number}
     */
    castShadow: false
}, {

    type: 'POINT_LIGHT',

    uniformTemplates: {
        pointLightPosition: {
            type: '3f',
            value: function(instance) {
                return instance.getWorldPosition()._array;
            }
        },
        pointLightRange: {
            type: '1f',
            value: function(instance) {
                return instance.range;
            }
        },
        pointLightColor: {
            type: '3f',
            value: function(instance) {
                var color = instance.color,
                    intensity = instance.intensity;
                return [ color[0]*intensity, color[1]*intensity, color[2]*intensity ];
            }
        }
    },
    /**
     * @return {qtek.light.Point}
     * @memberOf qtek.light.Point.prototype
     */
    clone: function() {
        var light = Light.prototype.clone.call(this);
        light.range = this.range;
        return light;
    }
});

export default PointLight;
