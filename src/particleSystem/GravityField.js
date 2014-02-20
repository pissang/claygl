define(function(require) {

    var Base = require('../core/Base');
    var Vector3 = require('../math/Vector3');
    var glMatrix = require('glmatrix');
    var vec3 =  glMatrix.vec3;

    var GravityField = Base.derive(function() {
        return {
            gravity : new Vector3(0, -10, 0)
        }
    }, {
        applyTo : function(velocity, position, weight, deltaTime) {
            if (weight > 0) {
                vec3.scaleAndAdd(velocity._array, velocity._array, this.gravity._array, deltaTime);
            }
        }
    });

    return GravityField;
});