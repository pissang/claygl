define(function(require) {

    var Vector3 = require('./Vector3');
    var glmatrix = require('glmatrix');
    var vec3 = glmatrix.vec3;

    var Plane = function(normal, distance) {
        this.normal = normal || new Vector3();
        this.distance = distance;
    }

    Plane.prototype = {

        constructor : Plane,

        distanceToPoint : function(point) {
            return vec3.dot(point._array, this.normal._array) - this.distance;
        },

        normalize : function() {
            var invLen = 1 / vec3.len(this.normal._array);
            vec3.scale(this.normal._array, invLen);
            this.distance *= invLen;
        }
    }

    return Plane;
});