define(function(require) {

    var Base = require('../core/Base');
    var Vector3 = require('../math/Vector3');
    var glMatrix = require('glmatrix');
    var vec3 =  glMatrix.vec3;

    var ForceField = Base.derive(function() {
        return {
            force : new Vector3()
        }
    }, {
        applyTo : function(velocity, position, weight, deltaTime) {
            if (weight > 0) {
                vec3.scaleAndAdd(velocity._array, velocity._array, this.force._array, deltaTime / weight);
            }
        }
    });

    return ForceField;
})