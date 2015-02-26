define(function(require) {

    'use strict';

    var Vector3 = require('./Vector3');
    var glMatrix = require('../dep/glmatrix');
    var vec3 = glMatrix.vec3;
    
    var EPSILON = 1e-5;

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
    };

    Ray.prototype = {
        
        constructor: Ray,

        // http://www.siggraph.org/education/materials/HyperGraph/raytrace/rayplane_intersection.htm
        /**
         * Calculate intersection point between ray and a give plane
         * @param  {qtek.math.Plane} plane
         * @param  {qtek.math.Vector3} [out]
         * @return {qtek.math.Vector3}
         */
        intersectPlane: function(plane, out) {
            var pn = plane.normal._array;
            var d = plane.distance;
            var ro = this.origin._array;
            var rd = this.direction._array;

            var divider = vec3.dot(pn, rd);
            // ray is parallel to the plane
            if (divider === 0) {
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
        mirrorAgainstPlane: function(plane) {
            // Distance to plane
            var d = vec3.dot(plane.normal._array, this.direction._array);
            vec3.scaleAndAdd(this.direction._array, this.direction._array, plane.normal._array, -d * 2);
            this.direction._dirty = true;
        },

        distanceToPoint: (function () {
            var v = vec3.create();
            return function (point) {
                vec3.sub(v, point, this.origin._array);
                // Distance from projection point to origin
                var b = vec3.dot(v, this.direction._array);
                if (b < 0) {
                    return vec3.distance(this.origin._array, point);
                }
                // Squared distance from center to origin
                var c2 = vec3.lenSquared(v);
                // Squared distance from center to projection point
                return Math.sqrt(c2 - b * b);
            };
        })(),

        /**
         * Calculate intersection point between ray and sphere
         * @param  {qtek.math.Vector3} center
         * @param  {number} radius
         * @param  {qtek.math.Vector3} out
         * @return {qtek.math.Vector3}
         */
        intersectSphere: (function () {
            var v = vec3.create();
            return function (center, radius, out) {
                var origin = this.origin._array;
                var direction = this.direction._array;
                center = center._array;
                vec3.sub(v, center, origin);
                // Distance from projection point to origin
                var b = vec3.dot(v, direction);
                // Squared distance from center to origin
                var c2 = vec3.squaredLength(v);
                // Squared distance from center to projection point
                var d2 = c2 - b * b;

                var r2 = radius * radius;
                // No intersection
                if (d2 > r2) {
                    return;
                }

                var a = Math.sqrt(r2 - d2);
                // First intersect point
                var t0 = b - a;
                // Second intersect point
                var t1 = b + a;

                if (!out) {
                    out = new Vector3();
                }
                if (t0 < 0) {
                    if (t1 < 0) {
                        return null;
                    } else {
                        vec3.scaleAndAdd(out._array, origin, direction, t1);
                        return out;
                    }
                } else {
                    vec3.scaleAndAdd(out._array, origin, direction, t0);
                    return out;
                }
            };
        })(),

        // http://www.scratchapixel.com/lessons/3d-basic-lessons/lesson-7-intersecting-simple-shapes/ray-box-intersection/
        /**
         * Calculate intersection point between ray and bounding box
         * @param {qtek.math.BoundingBox} bbox
         * @param {qtek.math.Vector3}
         * @return {qtek.math.Vector3}
         */
        intersectBoundingBox: function(bbox, out) {
            var dir = this.direction._array;
            var origin = this.origin._array;
            var min = bbox.min._array;
            var max = bbox.max._array;

            var invdirx = 1 / dir[0];
            var invdiry = 1 / dir[1];
            var invdirz = 1 / dir[2];

            var tmin, tmax, tymin, tymax, tzmin, tzmax;
            if (invdirx >= 0) {
                tmin = (min[0] - origin[0]) * invdirx;
                tmax = (max[0] - origin[0]) * invdirx;
            } else {
                tmax = (min[0] - origin[0]) * invdirx;
                tmin = (max[0] - origin[0]) * invdirx;
            }
            if (invdiry >= 0) {
                tymin = (min[1] - origin[1]) * invdiry;
                tymax = (max[1] - origin[1]) * invdiry;
            } else {
                tymax = (min[1] - origin[1]) * invdiry;
                tymin = (max[1] - origin[1]) * invdiry;
            }

            if ((tmin > tymax) || (tymin > tmax)) {
                return null;
            }

            if (tymin > tmin || tmin !== tmin) {
                tmin = tymin;
            }
            if (tymax < tmax || tmax !== tmax) {
                tmax = tymax;
            }

            if (invdirz >= 0) {
                tzmin = (min[2] - origin[2]) * invdirz;
                tzmax = (max[2] - origin[2]) * invdirz;
            } else {
                tzmax = (min[2] - origin[2]) * invdirz;
                tzmin = (max[2] - origin[2]) * invdirz;
            }

            if ((tmin > tzmax) || (tzmin > tmax)) {
                return null;
            }

            if (tzmin > tmin || tmin !== tmin) {
                tmin = tzmin;
            }
            if (tzmax < tmax || tmax !== tmax) {
                tmax = tzmax;
            }
            if (tmax < 0) {
                return null;
            }

            var t = tmin >= 0 ? tmin : tmax;

            if (!out) {
                out = new Vector3();
            }
            vec3.scaleAndAdd(out._array, origin, dir, t);
            return out;
        },

        // http://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm
        /**
         * Calculate intersection point between ray and three triangle vertices
         * @param {qtek.math.Vector3} a
         * @param {qtek.math.Vector3} b
         * @param {qtek.math.Vector3} c
         * @param {boolean}           singleSided, CW triangle will be ignored
         * @param {qtek.math.Vector3} [out]
         * @param {qtek.math.Vector3} [barycenteric] barycentric coords
         * @return {qtek.math.Vector3}
         */
        intersectTriangle: (function() {
            
            var eBA = vec3.create();
            var eCA = vec3.create();
            var AO = vec3.create();
            var vCross = vec3.create();

            return function(a, b, c, singleSided, out, barycenteric) {
                var dir = this.direction._array;
                var origin = this.origin._array;
                a = a._array;
                b = b._array;
                c = c._array;

                vec3.sub(eBA, b, a);
                vec3.sub(eCA, c, a);

                vec3.cross(vCross, eCA, dir);

                var det = vec3.dot(eBA, vCross);

                if (singleSided) {
                    if (det > -EPSILON) {
                        return null;
                    }
                }
                else {
                    if (det > -EPSILON && det < EPSILON) {
                        return null;
                    }
                }

                vec3.sub(AO, origin, a);
                var u = vec3.dot(vCross, AO) / det;
                if (u < 0 || u > 1) {
                    return null;
                }

                vec3.cross(vCross, eBA, AO);
                var v = vec3.dot(dir, vCross) / det;

                if (v < 0 || v > 1 || (u + v > 1)) {
                    return null;
                }

                vec3.cross(vCross, eBA, eCA);
                var t = -vec3.dot(AO, vCross) / det;

                if (t < 0) {
                    return null;
                }

                if (!out) {
                    out = new Vector3();
                }
                if (barycenteric) {
                    Vector3.set(barycenteric, (1 - u - v), u, v);
                }
                vec3.scaleAndAdd(out._array, origin, dir, t);

                return out;
            };
        })(),

        /**
         * Apply an affine transform matrix to the ray
         * @return {qtek.math.Matrix4} matrix
         */
        applyTransform: function(matrix) {
            Vector3.add(this.direction, this.direction, this.origin);
            Vector3.transformMat4(this.origin, this.origin, matrix);
            Vector3.transformMat4(this.direction, this.direction, matrix);

            Vector3.sub(this.direction, this.direction, this.origin);
            Vector3.normalize(this.direction, this.direction);
        },

        /**
         * Copy values from another ray
         * @param {qtek.math.Ray} ray
         */
        copy: function(ray) {
            Vector3.copy(this.origin, ray.origin);
            Vector3.copy(this.direction, ray.direction);
        },

        /**
         * Clone a new ray
         * @return {qtek.math.Ray}
         */
        clone: function() {
            var ray = new Ray();
            ray.copy(this);
            return ray;
        }
    };

    return Ray;
});