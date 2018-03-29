import BoundingBox from './BoundingBox';
import Plane from './Plane';

import vec3 from '../glmatrix/vec3';

var vec3Set = vec3.set;
var vec3Copy = vec3.copy;
var vec3TranformMat4 = vec3.transformMat4;
var mathMin = Math.min;
var mathMax = Math.max;
/**
 * @constructor
 * @alias clay.Frustum
 */
var Frustum = function() {

    /**
     * Eight planes to enclose the frustum
     * @type {clay.Plane[]}
     */
    this.planes = [];

    for (var i = 0; i < 6; i++) {
        this.planes.push(new Plane());
    }

    /**
     * Bounding box of frustum
     * @type {clay.BoundingBox}
     */
    this.boundingBox = new BoundingBox();

    /**
     * Eight vertices of frustum
     * @type {Float32Array[]}
     */
    this.vertices = [];
    for (var i = 0; i < 8; i++) {
        this.vertices[i] = vec3.fromValues(0, 0, 0);
    }
};

Frustum.prototype = {

    // http://web.archive.org/web/20120531231005/http://crazyjoke.free.fr/doc/3D/plane%20extraction.pdf
    /**
     * Set frustum from a projection matrix
     * @param {clay.Matrix4} projectionMatrix
     */
    setFromProjection: function(projectionMatrix) {

        var planes = this.planes;
        var m = projectionMatrix.array;
        var m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3];
        var m4 = m[4], m5 = m[5], m6 = m[6], m7 = m[7];
        var m8 = m[8], m9 = m[9], m10 = m[10], m11 = m[11];
        var m12 = m[12], m13 = m[13], m14 = m[14], m15 = m[15];

        // Update planes
        vec3Set(planes[0].normal.array, m3 - m0, m7 - m4, m11 - m8);
        planes[0].distance = -(m15 - m12);
        planes[0].normalize();

        vec3Set(planes[1].normal.array, m3 + m0, m7 + m4, m11 + m8);
        planes[1].distance = -(m15 + m12);
        planes[1].normalize();

        vec3Set(planes[2].normal.array, m3 + m1, m7 + m5, m11 + m9);
        planes[2].distance = -(m15 + m13);
        planes[2].normalize();

        vec3Set(planes[3].normal.array, m3 - m1, m7 - m5, m11 - m9);
        planes[3].distance = -(m15 - m13);
        planes[3].normalize();

        vec3Set(planes[4].normal.array, m3 - m2, m7 - m6, m11 - m10);
        planes[4].distance = -(m15 - m14);
        planes[4].normalize();

        vec3Set(planes[5].normal.array, m3 + m2, m7 + m6, m11 + m10);
        planes[5].distance = -(m15 + m14);
        planes[5].normalize();

        // Perspective projection
        var boundingBox = this.boundingBox;
        var vertices = this.vertices;
        if (m15 === 0)  {
            var aspect = m5 / m0;
            var zNear = -m14 / (m10 - 1);
            var zFar = -m14 / (m10 + 1);
            var farY = -zFar / m5;
            var nearY = -zNear / m5;
            // Update bounding box
            boundingBox.min.set(-farY * aspect, -farY, zFar);
            boundingBox.max.set(farY * aspect, farY, zNear);
            // update vertices
            //--- min z
            // min x
            vec3Set(vertices[0], -farY * aspect, -farY, zFar);
            vec3Set(vertices[1], -farY * aspect, farY, zFar);
            // max x
            vec3Set(vertices[2], farY * aspect, -farY, zFar);
            vec3Set(vertices[3], farY * aspect, farY, zFar);
            //-- max z
            vec3Set(vertices[4], -nearY * aspect, -nearY, zNear);
            vec3Set(vertices[5], -nearY * aspect, nearY, zNear);
            vec3Set(vertices[6], nearY * aspect, -nearY, zNear);
            vec3Set(vertices[7], nearY * aspect, nearY, zNear);
        }
        else { // Orthographic projection
            var left = (-1 - m12) / m0;
            var right = (1 - m12) / m0;
            var top = (1 - m13) / m5;
            var bottom = (-1 - m13) / m5;
            var near = (-1 - m14) / m10;
            var far = (1 - m14) / m10;


            boundingBox.min.set(Math.min(left, right), Math.min(bottom, top), Math.min(far, near));
            boundingBox.max.set(Math.max(right, left), Math.max(top, bottom), Math.max(near, far));

            var min = boundingBox.min.array;
            var max = boundingBox.max.array;
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
        }
    },

    /**
     * Apply a affine transform matrix and set to the given bounding box
     * @function
     * @param {clay.BoundingBox}
     * @param {clay.Matrix4}
     * @return {clay.BoundingBox}
     */
    getTransformedBoundingBox: (function() {

        var tmpVec3 = vec3.create();

        return function(bbox, matrix) {
            var vertices = this.vertices;

            var m4 = matrix.array;
            var min = bbox.min;
            var max = bbox.max;
            var minArr = min.array;
            var maxArr = max.array;
            var v = vertices[0];
            vec3TranformMat4(tmpVec3, v, m4);
            vec3Copy(minArr, tmpVec3);
            vec3Copy(maxArr, tmpVec3);

            for (var i = 1; i < 8; i++) {
                v = vertices[i];
                vec3TranformMat4(tmpVec3, v, m4);

                minArr[0] = mathMin(tmpVec3[0], minArr[0]);
                minArr[1] = mathMin(tmpVec3[1], minArr[1]);
                minArr[2] = mathMin(tmpVec3[2], minArr[2]);

                maxArr[0] = mathMax(tmpVec3[0], maxArr[0]);
                maxArr[1] = mathMax(tmpVec3[1], maxArr[1]);
                maxArr[2] = mathMax(tmpVec3[2], maxArr[2]);
            }

            min._dirty = true;
            max._dirty = true;

            return bbox;
        };
    }) ()
};
export default Frustum;
