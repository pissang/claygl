import Field from './Field';
import Vector3 from '../math/Vector3';
import glMatrix from '../dep/glmatrix';
var vec3 =  glMatrix.vec3;

/**
 * @constructor clay.particle.ForceField
 * @extends clay.particle.Field
 */
var ForceField = Field.extend(function() {
    return {
        force: new Vector3()
    };
}, {
    applyTo: function(velocity, position, weight, deltaTime) {
        if (weight > 0) {
            vec3.scaleAndAdd(velocity.array, velocity.array, this.force.array, deltaTime / weight);
        }
    }
});

export default ForceField;
