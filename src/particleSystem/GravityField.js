define(function(require) {

    var Base = require('../core/Base');
    var glMatrix = require('glmatrix');
    var vec3 =  glMatrix.vec3;

    var GravityField = Base.derive(function() {
        gravity : -10
    }, {
        applyTo : function(velocity, position, weight, deltaTime) {
            if (weight > 0) {
                velocity._array[1] += this.gravity * deltaTime;
            }
        }
    });

    return GravityField;
});