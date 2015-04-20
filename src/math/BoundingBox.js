define(function(require) {

    'use strict';

    var Vector3 = require('./Vector3');
    var glMatrix = require('../dep/glmatrix');
    var vec3 = glMatrix.vec3;

    var vec3TransformMat4 = vec3.transformMat4;
    var vec3Copy = vec3.copy;
    var vec3Set = vec3.set;

    /**
     * Axis aligned bounding box
     * @constructor
     * @alias qtek.math.BoundingBox
     * @param {qtek.math.Vector3} [min]
     * @param {qtek.math.Vector3} [max]
     */
    var BoundingBox = function(min, max) {

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
    };

    BoundingBox.prototype = {
        
        constructor: BoundingBox,
        /**
         * Update min and max coords from a vertices array
         * @param  {array} vertices
         */
        updateFromVertices: function(vertices) {
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
        union: function(bbox) {
            var min = this.min;
            var max = this.max;
            vec3.min(min._array, min._array, bbox.min._array);
            vec3.max(max._array, max._array, bbox.max._array);
            min._dirty = true;
            max._dirty = true;
        },

        /**
         * If intersect with another bounding box
         * @param  {qtek.math.BoundingBox} bbox
         * @return {boolean}
         */
        intersectBoundingBox: function(bbox) {
            var _min = this.min._array;
            var _max = this.max._array;

            var _min2 = bbox.min._array;
            var _max2 = bbox.max._array;

            return ! (_min[0] > _max2[0] || _min[1] > _max2[1] || _min[2] > _max2[2]
                || _max[0] < _min2[0] || _max[1] < _min2[1] || _max[2] < _min2[2]);
        },

        /**
         * Apply an affine transform matrix to the bounding box 
         * @param  {qtek.math.Matrix4} matrix
         */
        applyTransform: function(matrix) {
            var min = this.min;
            var max = this.max;
            if (min._dirty || max._dirty) {
                this.updateVertices();
            }

            var m4 = matrix._array;
            var minArr = min._array;
            var maxArr = max._array;
            var vertices = this.vertices;

            var v = vertices[0];
            vec3TransformMat4(v, v, m4);
            vec3Copy(minArr, v);
            vec3Copy(maxArr, v);

            for (var i = 1; i < 8; i++) {
                v = vertices[i];
                vec3TransformMat4(v, v, m4);

                if (v[0] < minArr[0]) { minArr[0] = v[0]; }
                if (v[1] < minArr[1]) { minArr[1] = v[1]; }
                if (v[2] < minArr[2]) { minArr[2] = v[2]; }

                if (v[0] > maxArr[0]) { maxArr[0] = v[0]; }
                if (v[1] > maxArr[1]) { maxArr[1] = v[1]; }
                if (v[2] > maxArr[2]) { maxArr[2] = v[2]; }
            }

            min._dirty = true;
            max._dirty = true;
        },

        /**
         * Apply a projection matrix to the bounding box
         * @param  {qtek.math.Matrix4} matrix
         */
        applyProjection: function(matrix) {
            var min = this.min;
            var max = this.max;
            if (min._dirty || max._dirty) {
                this.updateVertices();
            }

            var m = matrix._array;
            var vertices = this.vertices;
            // min in min z
            var v1 = vertices[0];
            // max in min z
            var v2 = vertices[3];
            // max in max z
            var v3 = vertices[7];

            var minArr = min._array;
            var maxArr = max._array;

            if (m[15] === 1) {  // Orthographic projection
                minArr[0] = m[0] * v1[0] + m[12];
                minArr[1] = m[5] * v1[1] + m[13];
                maxArr[2] = m[10] * v1[2] + m[14];

                maxArr[0] = m[0] * v3[0] + m[12];
                maxArr[1] = m[5] * v3[1] + m[13];
                minArr[2] = m[10] * v3[2] + m[14];
            } else {
                var w = -1 / v1[2];
                minArr[0] = m[0] * v1[0] * w;
                minArr[1] = m[5] * v1[1] * w;
                maxArr[2] = (m[10] * v1[2] + m[14]) * w;

                w = -1 / v2[2];
                maxArr[0] = m[0] * v2[0] * w;
                maxArr[1] = m[5] * v2[1] * w;

                w = -1 / v3[2];
                minArr[2] = (m[10] * v3[2] + m[14]) * w;
            }
            min._dirty = true;
            max._dirty = true;
        },

        updateVertices: function() {
            var min = this.min._array;
            var max = this.max._array;
            var vertices = this.vertices;
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
        },
        /**
         * Copy values from another bounding box
         * @param  {qtek.math.BoundingBox} bbox
         */
        copy: function(bbox) {
            var min = this.min;
            var max = this.max;
            vec3Copy(min._array, bbox.min._array);
            vec3Copy(max._array, bbox.max._array);
            min._dirty = true;
            max._dirty = true;
        },

        /**
         * Clone a new bounding box
         * @return {qtek.math.BoundingBox}
         */
        clone: function() {
            var boundingBox = new BoundingBox();
            boundingBox.copy(this);
            return boundingBox;
        }
    };

    return BoundingBox;
});