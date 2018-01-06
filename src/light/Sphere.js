import Light from '../Light';

/**
 * @constructor clay.light.Sphere
 * @extends {clay.Light}
 */
var SphereLight = Light.extend(
/** @lends clay.light.Sphere# */
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
                return instance.getWorldPosition().array;
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
