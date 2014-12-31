define(function(require) {

    var Field = require('./Field');
    var Vector3 = require('../math/Vector3');
    var glMatrix = require('../dep/glmatrix');
    var vec3 =  glMatrix.vec3;

    /**
     * @constructor qtek.particleSystem.ForceField
     * @extends qtek.particleSystem.Field
     */
    var ForceField = Field.derive(function() {
        return {
            force: new Vector3()
        };
    }, {
        applyTo: function(velocity, position, weight, deltaTime) {
            if (weight > 0) {
                vec3.scaleAndAdd(velocity._array, velocity._array, this.force._array, deltaTime / weight);
            }
        }
    });

    return ForceField;
});