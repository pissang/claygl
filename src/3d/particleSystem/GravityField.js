define(function(require) {

    var Base = require('core/Base');
    var glMatrix = require('glmatrix');
    var vec3 =  glMatrix.vec3;

    var GravityField = Base.derive(function() {
        gravity : 0
    }, {
        applyTo : function(velocity, position, weight, deltaTime) {
            velocity._array[1] -= this.gravity * deltaTime / weight;
        }
    });

    return GravityField;
});