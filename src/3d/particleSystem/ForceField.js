define(function(require) {

    var Base = require('core/base');
    var Vector3 = require('core/Vector3');
    var glMatrix = require('glmatrix');
    var vec3 =  glMatrix.vec3;

    var ForceField = Base.derive(function() {
        return {
            force : new Vector3(),
            _acceleration : new Vector3()
        }
    }, {
        applyTo : function(velocity, position, weight, deltaTime) {
            var a = this._acceleration;
            vec3.scale(a._array, this.force._array, deltaTime / weight);
            vec3.add(velocity._array, velocity._array, a._array);
        }
    });

    return ForceField;
})