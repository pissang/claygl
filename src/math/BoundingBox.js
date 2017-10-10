import Vector3 from './Vector3';
import glMatrix from '../dep/glmatrix';
var vec3 = glMatrix.vec3;

var vec3Copy = vec3.copy;
var vec3Set = vec3.set;

/**
 * Axis aligned bounding box
 * @constructor
 * @alias qtek.math.BoundingBox
 * @param {qtek.math.Vector3} [min]
 * @param {qtek.math.Vector3} [max]
 */
var BoundingBox = function (min, max) {

    /**
     * Minimum coords of bounding box
     * @type {qtek.math.Vector3}
     */
    this.min = min || new Vector3(Infinity, Infinity, Infinity);

    /**
     * Maximum coords of bounding box
     * @type {qtek.math.Vector3}
     */
    this.max = max || new Vector3(-Infinity, -Infinity, -Infinity);
};

BoundingBox.prototype = {

    constructor: BoundingBox,
    /**
     * Update min and max coords from a vertices array
     * @param  {array} vertices
     */
    updateFromVertices: function (vertices) {
        if (vertices.length > 0) {
            var min = this.min;
            var max = this.max;
            var minArr = min._array;
            var maxArr = max._array;
            vec3Copy(minArr, vertices[0]);
            vec3Copy(maxArr, vertices[0]);
            for (var i = 1; i < vertices.length; i++) {
                var vertex = vertices[i];

                if (vertex[0] < minArr[0]) { minArr[0] = vertex[0]; }
                if (vertex[1] < minArr[1]) { minArr[1] = vertex[1]; }
                if (vertex[2] < minArr[2]) { minArr[2] = vertex[2]; }

                if (vertex[0] > maxArr[0]) { maxArr[0] = vertex[0]; }
                if (vertex[1] > maxArr[1]) { maxArr[1] = vertex[1]; }
                if (vertex[2] > maxArr[2]) { maxArr[2] = vertex[2]; }
            }
            min._dirty = true;
            max._dirty = true;
        }
    },

    /**
     * Union operation with another bounding box
     * @param  {qtek.math.BoundingBox} bbox
     */
    union: function (bbox) {
        var min = this.min;
        var max = this.max;
        vec3.min(min._array, min._array, bbox.min._array);
        vec3.max(max._array, max._array, bbox.max._array);
        min._dirty = true;
        max._dirty = true;
        return this;
    },

    /**
     * Intersection operation with another bounding box
     * @param  {qtek.math.BoundingBox} bbox
     */
    intersection: function (bbox) {
        var min = this.min;
        var max = this.max;
        vec3.max(min._array, min._array, bbox.min._array);
        vec3.min(max._array, max._array, bbox.max._array);
        min._dirty = true;
        max._dirty = true;
        return this;
    },

    /**
     * If intersect with another bounding box
     * @param  {qtek.math.BoundingBox} bbox
     * @return {boolean}
     */
    intersectBoundingBox: function (bbox) {
        var _min = this.min._array;
        var _max = this.max._array;

        var _min2 = bbox.min._array;
        var _max2 = bbox.max._array;

        return ! (_min[0] > _max2[0] || _min[1] > _max2[1] || _min[2] > _max2[2]
            || _max[0] < _min2[0] || _max[1] < _min2[1] || _max[2] < _min2[2]);
    },

    /**
     * If contain another bounding box entirely
     * @param  {qtek.math.BoundingBox} bbox
     * @return {boolean}
     */
    containBoundingBox: function (bbox) {

        var _min = this.min._array;
        var _max = this.max._array;

        var _min2 = bbox.min._array;
        var _max2 = bbox.max._array;

        return _min[0] <= _min2[0] && _min[1] <= _min2[1] && _min[2] <= _min2[2]
            && _max[0] >= _max2[0] && _max[1] >= _max2[1] && _max[2] >= _max2[2];
    },

    /**
     * If contain point entirely
     * @param  {qtek.math.Vector3} point
     * @return {boolean}
     */
    containPoint: function (p) {
        var _min = this.min._array;
        var _max = this.max._array;

        var _p = p._array;

        return _min[0] <= _p[0] && _min[1] <= _p[1] && _min[2] <= _p[2]
            && _max[0] >= _p[0] && _max[1] >= _p[1] && _max[2] >= _p[2];
    },

    /**
     * If bounding box is finite
     */
    isFinite: function () {
        var _min = this.min._array;
        var _max = this.max._array;
        return isFinite(_min[0]) && isFinite(_min[1]) && isFinite(_min[2])
            && isFinite(_max[0]) && isFinite(_max[1]) && isFinite(_max[2]);
    },

    /**
     * Apply an affine transform matrix to the bounding box
     * @param  {qtek.math.Matrix4} matrix
     */
    applyTransform: (function () {
        // http://dev.theomader.com/transform-bounding-boxes/
        var xa = vec3.create();
        var xb = vec3.create();
        var ya = vec3.create();
        var yb = vec3.create();
        var za = vec3.create();
        var zb = vec3.create();

        return function (matrix) {
            var min = this.min._array;
            var max = this.max._array;

            var m = matrix._array;

            xa[0] = m[0] * min[0]; xa[1] = m[1] * min[0]; xa[2] = m[2] * min[0];
            xb[0] = m[0] * max[0]; xb[1] = m[1] * max[0]; xb[2] = m[2] * max[0];

            ya[0] = m[4] * min[1]; ya[1] = m[5] * min[1]; ya[2] = m[6] * min[1];
            yb[0] = m[4] * max[1]; yb[1] = m[5] * max[1]; yb[2] = m[6] * max[1];

            za[0] = m[8] * min[2]; za[1] = m[9] * min[2]; za[2] = m[10] * min[2];
            zb[0] = m[8] * max[2]; zb[1] = m[9] * max[2]; zb[2] = m[10] * max[2];

            min[0] = Math.min(xa[0], xb[0]) + Math.min(ya[0], yb[0]) + Math.min(za[0], zb[0]) + m[12];
            min[1] = Math.min(xa[1], xb[1]) + Math.min(ya[1], yb[1]) + Math.min(za[1], zb[1]) + m[13];
            min[2] = Math.min(xa[2], xb[2]) + Math.min(ya[2], yb[2]) + Math.min(za[2], zb[2]) + m[14];

            max[0] = Math.max(xa[0], xb[0]) + Math.max(ya[0], yb[0]) + Math.max(za[0], zb[0]) + m[12];
            max[1] = Math.max(xa[1], xb[1]) + Math.max(ya[1], yb[1]) + Math.max(za[1], zb[1]) + m[13];
            max[2] = Math.max(xa[2], xb[2]) + Math.max(ya[2], yb[2]) + Math.max(za[2], zb[2]) + m[14];

            this.min._dirty = true;
            this.max._dirty = true;

            return this;
        };
    })(),

    /**
     * Apply a projection matrix to the bounding box
     * @param  {qtek.math.Matrix4} matrix
     */
    applyProjection: function (matrix) {
        var min = this.min._array;
        var max = this.max._array;

        var m = matrix._array;
        // min in min z
        var v10 = min[0];
        var v11 = min[1];
        var v12 = min[2];
        // max in min z
        var v20 = max[0];
        var v21 = max[1];
        var v22 = min[2];
        // max in max z
        var v30 = max[0];
        var v31 = max[1];
        var v32 = max[2];

        if (m[15] === 1) {  // Orthographic projection
            min[0] = m[0] * v10 + m[12];
            min[1] = m[5] * v11 + m[13];
            max[2] = m[10] * v12 + m[14];

            max[0] = m[0] * v30 + m[12];
            max[1] = m[5] * v31 + m[13];
            min[2] = m[10] * v32 + m[14];
        }
        else {
            var w = -1 / v12;
            min[0] = m[0] * v10 * w;
            min[1] = m[5] * v11 * w;
            max[2] = (m[10] * v12 + m[14]) * w;

            w = -1 / v22;
            max[0] = m[0] * v20 * w;
            max[1] = m[5] * v21 * w;

            w = -1 / v32;
            min[2] = (m[10] * v32 + m[14]) * w;
        }
        this.min._dirty = true;
        this.max._dirty = true;

        return this;
    },

    updateVertices: function () {
        var vertices = this.vertices;
        if (!vertices) {
            // Cube vertices
            var vertices = [];
            for (var i = 0; i < 8; i++) {
                vertices[i] = vec3.fromValues(0, 0, 0);
            }

            /**
             * Eight coords of bounding box
             * @type {Float32Array[]}
             */
            this.vertices = vertices;
        }
        var min = this.min._array;
        var max = this.max._array;
        //--- min z
        // min x
        vec3Set(vertices[0], min[0], min[1], min[2]);
        vec3Set(vertices[1], min[0], max[1], min[2]);
        // max x
        vec3Set(vertices[2], max[0], min[1], min[2]);
        vec3Set(vertices[3], max[0], max[1], min[2]);

        //-- max z
        vec3Set(vertices[4], min[0], min[1], max[2]);
        vec3Set(vertices[5], min[0], max[1], max[2]);
        vec3Set(vertices[6], max[0], min[1], max[2]);
        vec3Set(vertices[7], max[0], max[1], max[2]);

        return this;
    },
    /**
     * Copy values from another bounding box
     * @param  {qtek.math.BoundingBox} bbox
     */
    copy: function (bbox) {
        var min = this.min;
        var max = this.max;
        vec3Copy(min._array, bbox.min._array);
        vec3Copy(max._array, bbox.max._array);
        min._dirty = true;
        max._dirty = true;
        return this;
    },

    /**
     * Clone a new bounding box
     * @return {qtek.math.BoundingBox}
     */
    clone: function () {
        var boundingBox = new BoundingBox();
        boundingBox.copy(this);
        return boundingBox;
    }
};

export default BoundingBox;
