import Light from '../Light';

/**
 * @constructor qtek.light.Sphere
 * @extends {qtek.Light}
 */
var SphereLight = Light.extend(
/** @lends qtek.light.Sphere# */
{
    /**
     * @type {number}
     */
    range: 100,

    /**
     * @type {number}
     */
    radius: 5
}, {

    type: 'SPHERE_LIGHT',

    uniformTemplates: {
        sphereLightPosition: {
            type: '3f',
            value: function(instance) {
                return instance.getWorldPosition()._array;
            }
        },
        sphereLightRange: {
            type: '1f',
            value: function(instance) {
                return instance.range;
            }
        },
        sphereLightRadius: {
            type: '1f',
            value: function(instance) {
                return instance.radius;
            }
        },
        sphereLightColor: {
            type: '3f',
            value: function(instance) {
                var color = instance.color;
                var intensity = instance.intensity;
                return [color[0]*intensity, color[1]*intensity, color[2]*intensity];
            }
        }
    }
});

export default SphereLight;
