define(function(require) {

    var Base = require('../core/Base');
    var Vector3 = require('./Vector3');
    var glMatrix = require('glmatrix');
    var vec3 = glMatrix.vec3;

    /**
     * @constructor
     * @alias qtek.math.Ray
     * @param {qtek.math.Vector3} [origin]
     * @param {qtek.math.Vector3} [direction]
     */
    var Ray = function(origin, direction) {
        /**
         * @type {qtek.math.Vector3}
         */
        this.origin = origin || new Vector3();
        /**
         * @type {qtek.math.Vector3}
         */
        this.direction = direction || new Vector3();
    }
    Ray.prototype = {
        
        constructor : Ray,

        // http://www.siggraph.org/education/materials/HyperGraph/raytrace/rayplane_intersection.htm
        /**
         * Calculate intersection point between ray and a give plane
         * @param  {qtek.math.Plane} plane
         * @param  {qtek.math.Vector3} [out]
         * @return {qtek.math.Vector3}
         */
        intersectPlane : function(plane, out) {
            var pn = plane.normal._array;
            var d = plane.distance;
            var ro = this.origin._array;
            var rd = this.direction._array;

            var divider = vec3.dot(pn, rd);
            // ray is parallel to the plane
            if (divider == 0) {
                return null;
            }
            if (!out) {
                out = new Vector3();
            }
            var t = (vec3.dot(pn, ro) - d) / divider;
            vec3.scaleAndAdd(out._array, ro, rd, -t);
            out._dirty = true;
            return out;
        },

        /**
         * Mirror the ray against plane
         * @param  {qtek.math.Plane} plane
         */
        mirrorAgainstPlane : function(plane) {
            // Distance to plane
            var d = vec3.dot(plane.normal._array, this.direction._array);
            vec3.scaleAndAdd(this.direction._array, this.direction._array, plane.normal._array, -d * 2);
            this.direction_dirty = true;
        },

        // http://www.graphics.cornell.edu/pubs/1997/MT97.html
        intersectTriangle : function() {
            
        }
    };

    return Ray;
});