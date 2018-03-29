import Vector3 from './Vector3';
import mat4 from '../glmatrix/mat4';
import vec3 from '../glmatrix/vec3';
import vec4 from '../glmatrix/vec4';

/**
 * @constructor
 * @alias clay.Plane
 * @param {clay.Vector3} [normal]
 * @param {number} [distance]
 */
var Plane = function(normal, distance) {
    /**
     * Normal of the plane
     * @type {clay.Vector3}
     */
    this.normal = normal || new Vector3(0, 1, 0);

    /**
     * Constant of the plane equation, used as distance to the origin
     * @type {number}
     */
    this.distance = distance || 0;
};

Plane.prototype = {

    constructor: Plane,

    /**
     * Distance from a given point to the plane
     * @param  {clay.Vector3} point
     * @return {number}
     */
    distanceToPoint: function(point) {
        return vec3.dot(point.array, this.normal.array) - this.distance;
    },

    /**
     * Calculate the projection point on the plane
     * @param  {clay.Vector3} point
     * @param  {clay.Vector3} out
     * @return {clay.Vector3}
     */
    projectPoint: function(point, out) {
        if (!out) {
            out = new Vector3();
        }
        var d = this.distanceToPoint(point);
        vec3.scaleAndAdd(out.array, point.array, this.normal.array, -d);
        out._dirty = true;
        return out;
    },

    /**
     * Normalize the plane's normal and calculate the distance
     */
    normalize: function() {
        var invLen = 1 / vec3.len(this.normal.array);
        vec3.scale(this.normal.array, invLen);
        this.distance *= invLen;
    },

    /**
     * If the plane intersect a frustum
     * @param  {clay.Frustum} Frustum
     * @return {boolean}
     */
    intersectFrustum: function(frustum) {
        // Check if all coords of frustum is on plane all under plane
        var coords = frustum.vertices;
        var normal = this.normal.array;
        var onPlane = vec3.dot(coords[0].array, normal) > this.distance;
        for (var i = 1; i < 8; i++) {
            if ((vec3.dot(coords[i].array, normal) > this.distance) != onPlane) {
                return true;
            }
        }
    },

    /**
     * Calculate the intersection point between plane and a given line
     * @function
     * @param {clay.Vector3} start start point of line
     * @param {clay.Vector3} end end point of line
     * @param {clay.Vector3} [out]
     * @return {clay.Vector3}
     */
    intersectLine: (function() {
        var rd = vec3.create();
        return function(start, end, out) {
            var d0 = this.distanceToPoint(start);
            var d1 = this.distanceToPoint(end);
            if ((d0 > 0 && d1 > 0) || (d0 < 0 && d1 < 0)) {
                return null;
            }
            // Ray intersection
            var pn = this.normal.array;
            var d = this.distance;
            var ro = start.array;
            // direction
            vec3.sub(rd, end.array, start.array);
            vec3.normalize(rd, rd);

            var divider = vec3.dot(pn, rd);
            // ray is parallel to the plane
            if (divider === 0) {
                return null;
            }
            if (!out) {
                out = new Vector3();
            }
            var t = (vec3.dot(pn, ro) - d) / divider;
            vec3.scaleAndAdd(out.array, ro, rd, -t);
            out._dirty = true;
            return out;
        };
    })(),

    /**
     * Apply an affine transform matrix to plane
     * @function
     * @return {clay.Matrix4}
     */
    applyTransform: (function() {
        var inverseTranspose = mat4.create();
        var normalv4 = vec4.create();
        var pointv4 = vec4.create();
        pointv4[3] = 1;
        return function(m4) {
            m4 = m4.array;
            // Transform point on plane
            vec3.scale(pointv4, this.normal.array, this.distance);
            vec4.transformMat4(pointv4, pointv4, m4);
            this.distance = vec3.dot(pointv4, this.normal.array);
            // Transform plane normal
            mat4.invert(inverseTranspose, m4);
            mat4.transpose(inverseTranspose, inverseTranspose);
            normalv4[3] = 0;
            vec3.copy(normalv4, this.normal.array);
            vec4.transformMat4(normalv4, normalv4, inverseTranspose);
            vec3.copy(this.normal.array, normalv4);
        };
    })(),

    /**
     * Copy from another plane
     * @param  {clay.Vector3} plane
     */
    copy: function(plane) {
        vec3.copy(this.normal.array, plane.normal.array);
        this.normal._dirty = true;
        this.distance = plane.distance;
    },

    /**
     * Clone a new plane
     * @return {clay.Plane}
     */
    clone: function() {
        var plane = new Plane();
        plane.copy(this);
        return plane;
    }
};

export default Plane;
