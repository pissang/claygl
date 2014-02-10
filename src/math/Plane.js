define(function(require) {

    var Vector3 = require('./Vector3');
    var glmatrix = require('glmatrix');
    var vec3 = glmatrix.vec3;
    var mat4 = glmatrix.mat4;
    var vec4 = glmatrix.vec4;

    var Plane = function(normal, distance) {
        this.normal = normal || new Vector3(0, 1, 0);
        this.distance = distance || 0;
    }

    Plane.prototype = {

        constructor : Plane,

        distanceToPoint : function(point) {
            return vec3.dot(point._array, this.normal._array) - this.distance;
        },

        projectPoint : function(point, out) {
            if (!out) {
                out = new Vector3();
            }
            var d = this.distanceToPoint(point);
            vec3.scaleAndAdd(out._array, point._array, this.normal._array, -d);
            out._dirty = true;
            return out;
        },

        normalize : function() {
            var invLen = 1 / vec3.len(this.normal._array);
            vec3.scale(this.normal._array, invLen);
            this.distance *= invLen;

            return this;
        },

        intersectFrustum : function(frustum) {
            // Check if all coords of frustum is on plane all under plane
            var coords = frustum.vertices;
            var normal = this.normal._array;
            var onPlane = vec3.dot(coords[0]._array, normal) > this.distance;
            for (var i = 1; i < 8; i++) {
                if ((vec3.dot(coords[i]._array, normal) > this.distance) != onPlane) {
                    return true;
                } 
            }
        },

        intersectLine : (function() {
            var rd = vec3.create();
            return function(start, end, out) {
                var d0 = this.distanceToPoint(start);
                var d1 = this.distanceToPoint(end);
                if ((d0 > 0 && d1 > 0) || (d0 < 0 && d1 < 0)) {
                    return null;
                }
                // Ray intersection
                var pn = this.normal._array;
                var d = this.distance;
                var ro = start._array;
                // direction
                vec3.sub(rd, end._array, start._array);
                vec3.normalize(rd, rd);

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
            };
        })(),

        applyTransform : (function() {
            var inverseTranspose = mat4.create();
            var normalv4 = vec4.create();
            var pointv4 = vec4.create();
            pointv4[3] = 1;
            return function(m4) {
                m4 = m4._array;
                // Transform point on plane
                vec3.scale(pointv4, this.normal._array, this.distance);
                vec4.transformMat4(pointv4, pointv4, m4);
                this.distance = vec3.dot(pointv4, this.normal._array);
                // Transform plane normal
                mat4.invert(inverseTranspose, m4);
                mat4.transpose(inverseTranspose, inverseTranspose);
                normalv4[3] = 0;
                vec3.copy(normalv4, this.normal._array);
                vec4.transformMat4(normalv4, normalv4, inverseTranspose);
                vec3.copy(this.normal._array, normalv4);

                return this;
            }
        })(),

        copy : function(plane) {
            vec3.copy(this.normal._array, plane.normal._array);
            this.normal._dirty = true;
            this.distance = plane.distance;
            return this;
        },

        clone : function() {
            var plane = new Plane();
            plane.copy(this);
            return plane;
        }
    }

    return Plane;
});