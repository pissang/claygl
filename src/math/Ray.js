define(function(require) {

    var Base = require('../core/Base');
    var Vector3 = require('./Vector3');
    var glMatrix = require('glmatrix');
    var vec3 = glMatrix.vec3;

    var Ray = function(origin, direction) {
        this.origin = origin || new Vector3();
        this.direction = direction || new Vector3();
    }
    Ray.prototype = {
        
        constructor : Ray,

        intersectPlane : function() {
            
        },

        intersectTriangle : function() {
            
        }
    };

    return Ray;
});