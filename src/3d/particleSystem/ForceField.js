define(function(require) {

    var Base = require('core/base');
    var Vector3 = require('core/Vector3');
    var glMatrix = require('glmatrix');
    var vec3 =  glMatrix.vec3;

    var ForceField = Base.derive(function() {
        return {
            force : new Vector3()
        }
    }, {
        applyTo : function(velocity, position, weight, deltaTime) {
            vec3.scaleAndAdd(velocity._array, velocity._array, this.force._array, deltaTime / weight);
        }
    });

    return ForceField;
})