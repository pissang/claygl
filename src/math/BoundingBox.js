import Vector3 from './Vector3';
import vec3 from '../glmatrix/vec3';

var vec3Set = vec3.set;
var vec3Copy = vec3.copy;

/**
 * Axis aligned bounding box
 * @constructor
 * @alias clay.BoundingBox
 * @param {clay.Vector3} [min]
 * @param {clay.Vector3} [max]
 */
var BoundingBox = function (min, max) {

    /**
     * Minimum coords of bounding box
     * @type {clay.Vector3}
     */
    this.min = min || new Vector3(Infinity, Infinity, Infinity);

    /**
     * Maximum coords of bounding box
     * @type {clay.Vector3}
     */
    this.max = max || new Vector3(-Infinity, -Infinity, -Infinity);

    this.vertices = null;
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
            var minArr = min.array;
            var maxArr = max.array;
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
     * @param  {clay.BoundingBox} bbox
     */
    union: function (bbox) {
        var min = this.min;
        var max = this.max;
        vec3.min(min.array, min.array, bbox.min.array);
        vec3.max(max.array, max.array, bbox.max.array);
        min._dirty = true;
        max._dirty = true;
        return this;
    },

    /**
     * Intersection operation with another bounding box
     * @param  {clay.BoundingBox} bbox
     */
    intersection: function (bbox) {
        var min = this.min;
        var max = this.max;
        vec3.max(min.array, min.array, bbox.min.array);
        vec3.min(max.array, max.array, bbox.max.array);
        min._dirty = true;
        max._dirty = true;
        return this;
    },

    /**
     * If intersect with another bounding box
     * @param  {clay.BoundingBox} bbox
     * @return {boolean}
     */
    intersectBoundingBox: function (bbox) {
        var _min = this.min.array;
        var _max = this.max.array;

        var _min2 = bbox.min.array;
        var _max2 = bbox.max.array;

        return ! (_min[0] > _max2[0] || _min[1] > _max2[1] || _min[2] > _max2[2]
            || _max[0] < _min2[0] || _max[1] < _min2[1] || _max[2] < _min2[2]);
    },

    /**
     * If contain another bounding box entirely
     * @param  {clay.BoundingBox} bbox
     * @return {boolean}
     */
    containBoundingBox: function (bbox) {

        var _min = this.min.array;
        var _max = this.max.array;

        var _min2 = bbox.min.array;
        var _max2 = bbox.max.array;

        return _min[0] <= _min2[0] && _min[1] <= _min2[1] && _min[2] <= _min2[2]
            && _max[0] >= _max2[0] && _max[1] >= _max2[1] && _max[2] >= _max2[2];
    },

    /**
     * If contain point entirely
     * @param  {clay.Vector3} point
     * @return {boolean}
     */
    containPoint: function (p) {
        var _min = this.min.array;
        var _max = this.max.array;

        var _p = p.array;

        return _min[0] <= _p[0] && _min[1] <= _p[1] && _min[2] <= _p[2]
            && _max[0] >= _p[0] && _max[1] >= _p[1] && _max[2] >= _p[2];
    },

    /**
     * If bounding box is finite
     */
    isFinite: function () {
        var _min = this.min.array;
        var _max = this.max.array;
        return isFinite(_min[0]) && isFinite(_min[1]) && isFinite(_min[2])
            && isFinite(_max[0]) && isFinite(_max[1]) && isFinite(_max[2]);
    },

    /**
     * Apply an affine transform matrix to the bounding box
     * @param  {clay.Matrix4} matrix
     */
    applyTransform: function (matrix) {
        this.transformFrom(this, matrix);
    },

    /**
     * Get from another bounding box and an affine transform matrix.
     * @param {clay.BoundingBox} source
     * @param {clay.Matrix4} matrix
     */
    transformFrom: (function () {
        // http://dev.theomader.com/transform-bounding-boxes/
        var xa = vec3.create();
        var xb = vec3.create();
        var ya = vec3.create();
        var yb = vec3.create();
        var za = vec3.create();
        var zb = vec3.create();

        return function (source, matrix) {
            var min = source.min.array;
            var max = source.max.array;

            var m = matrix.array;

            xa[0] = m[0] * min[0]; xa[1] = m[1] * min[0]; xa[2] = m[2] * min[0];
            xb[0] = m[0] * max[0]; xb[1] = m[1] * max[0]; xb[2] = m[2] * max[0];

            ya[0] = m[4] * min[1]; ya[1] = m[5] * min[1]; ya[2] = m[6] * min[1];
            yb[0] = m[4] * max[1]; yb[1] = m[5] * max[1]; yb[2] = m[6] * max[1];

            za[0] = m[8] * min[2]; za[1] = m[9] * min[2]; za[2] = m[10] * min[2];
            zb[0] = m[8] * max[2]; zb[1] = m[9] * max[2]; zb[2] = m[10] * max[2];

            min = this.min.array;
            max = this.max.array;
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
     * @param  {clay.Matrix4} matrix
     */
    applyProjection: function (matrix) {
        var min = this.min.array;
        var max = this.max.array;

        var m = matrix.array;
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
            vertices = [];
            for (var i = 0; i < 8; i++) {
                vertices[i] = vec3.fromValues(0, 0, 0);
            }

            /**
             * Eight coords of bounding box
             * @type {Float32Array[]}
             */
            this.vertices = vertices;
        }
        var min = this.min.array;
        var max = this.max.array;
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
     * @param  {clay.BoundingBox} bbox
     */
    copy: function (bbox) {
        var min = this.min;
        var max = this.max;
        vec3Copy(min.array, bbox.min.array);
        vec3Copy(max.array, bbox.max.array);
        min._dirty = true;
        max._dirty = true;
        return this;
    },

    /**
     * Clone a new bounding box
     * @return {clay.BoundingBox}
     */
    clone: function () {
        var boundingBox = new BoundingBox();
        boundingBox.copy(this);
        return boundingBox;
    }
};

export default BoundingBox;
