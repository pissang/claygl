define(function(require) {

    'use strict';

    var glMatrix = require('../dep/glmatrix');
    var Vector3 = require('./Vector3');
    var mat4 = glMatrix.mat4;
    var vec3 = glMatrix.vec3;
    var mat3 = glMatrix.mat3;
    var quat = glMatrix.quat;

    /**
     * @constructor
     * @alias qtek.math.Matrix4
     */
    var Matrix4 = function() {

        this._axisX = new Vector3();
        this._axisY = new Vector3();
        this._axisZ = new Vector3();

        /**
         * Storage of Matrix4
         * @name _array
         * @type {Float32Array}
         */
        this._array = mat4.create();

        /**
         * @name _dirty
         * @type {boolean}
         */
        this._dirty = true;
    };

    Matrix4.prototype = {

        constructor: Matrix4,

        /**
         * Calculate the adjugate of self, in-place
         * @return {qtek.math.Matrix4}
         */
        adjoint: function() {
            mat4.adjoint(this._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Clone a new Matrix4
         * @return {qtek.math.Matrix4}
         */
        clone: function() {
            return (new Matrix4()).copy(this);
        },

        /**
         * Copy from b
         * @param  {qtek.math.Matrix4} b
         * @return {qtek.math.Matrix4}
         */
        copy: function(a) {
            mat4.copy(this._array, a._array);
            this._dirty = true;
            return this;
        },

        /**
         * Calculate matrix determinant
         * @return {number}
         */
        determinant: function() {
            return mat4.determinant(this._array);
        },

        /**
         * Set upper 3x3 part from quaternion
         * @param  {qtek.math.Quaternion} q
         * @return {qtek.math.Matrix4}
         */
        fromQuat: function(q) {
            mat4.fromQuat(this._array, q._array);
            this._dirty = true;
            return this;
        },

        /**
         * Set from a quaternion rotation and a vector translation
         * @param  {qtek.math.Quaternion} q
         * @param  {qtek.math.Vector3} v
         * @return {qtek.math.Matrix4}
         */
        fromRotationTranslation: function(q, v) {
            mat4.fromRotationTranslation(this._array, q._array, v._array);
            this._dirty = true;
            return this;
        },

        /**
         * Set from Matrix2d, it is used when converting a 2d shape to 3d space.
         * In 3d space it is equivalent to ranslate on xy plane and rotate about z axis
         * @param  {qtek.math.Matrix2d} m2d
         * @return {qtek.math.Matrix4}
         */
        fromMat2d: function(m2d) {
            Matrix4.fromMat2d(this, m2d);
            return this;
        },

        /**
         * Set from frustum bounds
         * @param  {number} left
         * @param  {number} right
         * @param  {number} bottom
         * @param  {number} top
         * @param  {number} near
         * @param  {number} far
         * @return {qtek.math.Matrix4}
         */
        frustum: function(left, right, bottom, top, near, far) {
            mat4.frustum(this._array, left, right, bottom, top, near, far);
            this._dirty = true;
            return this;
        },

        /**
         * Set to a identity matrix
         * @return {qtek.math.Matrix4}
         */
        identity: function() {
            mat4.identity(this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Invert self
         * @return {qtek.math.Matrix4}
         */
        invert: function() {
            mat4.invert(this._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Set as a matrix with the given eye position, focal point, and up axis
         * @param  {qtek.math.Vector3} eye
         * @param  {qtek.math.Vector3} center
         * @param  {qtek.math.Vector3} up
         * @return {qtek.math.Matrix4}
         */
        lookAt: function(eye, center, up) {
            mat4.lookAt(this._array, eye._array, center._array, up._array);
            this._dirty = true;
            return this;
        },

        /**
         * Alias for mutiply
         * @param  {qtek.math.Matrix4} b
         * @return {qtek.math.Matrix4}
         */
        mul: function(b) {
            mat4.mul(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Alias for multiplyLeft
         * @param  {qtek.math.Matrix4} a
         * @return {qtek.math.Matrix4}
         */
        mulLeft: function(a) {
            mat4.mul(this._array, a._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Multiply self and b
         * @param  {qtek.math.Matrix4} b
         * @return {qtek.math.Matrix4}
         */
        multiply: function(b) {
            mat4.multiply(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Multiply a and self, a is on the left
         * @param  {qtek.math.Matrix3} a
         * @return {qtek.math.Matrix3}
         */
        multiplyLeft: function(a) {
            mat4.multiply(this._array, a._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Set as a orthographic projection matrix
         * @param  {number} left
         * @param  {number} right
         * @param  {number} bottom
         * @param  {number} top
         * @param  {number} near
         * @param  {number} far
         * @return {qtek.math.Matrix4}
         */
        ortho: function(left, right, bottom, top, near, far) {
            mat4.ortho(this._array, left, right, bottom, top, near, far);
            this._dirty = true;
            return this;
        },
        /**
         * Set as a perspective projection matrix
         * @param  {number} fovy
         * @param  {number} aspect
         * @param  {number} near
         * @param  {number} far
         * @return {qtek.math.Matrix4}
         */
        perspective: function(fovy, aspect, near, far) {
            mat4.perspective(this._array, fovy, aspect, near, far);
            this._dirty = true;
            return this;
        },

        /**
         * Rotate self by rad about axis.
         * Equal to right-multiply a rotaion matrix
         * @param  {number}   rad
         * @param  {qtek.math.Vector3} axis
         * @return {qtek.math.Matrix4}
         */
        rotate: function(rad, axis) {
            mat4.rotate(this._array, this._array, rad, axis._array);
            this._dirty = true;
            return this;
        },

        /**
         * Rotate self by a given radian about X axis.
         * Equal to right-multiply a rotaion matrix
         * @param {number} rad
         * @return {qtek.math.Matrix4}
         */
        rotateX: function(rad) {
            mat4.rotateX(this._array, this._array, rad);
            this._dirty = true;
            return this;
        },

        /**
         * Rotate self by a given radian about Y axis.
         * Equal to right-multiply a rotaion matrix
         * @param {number} rad
         * @return {qtek.math.Matrix4}
         */
        rotateY: function(rad) {
            mat4.rotateY(this._array, this._array, rad);
            this._dirty = true;
            return this;
        },

        /**
         * Rotate self by a given radian about Z axis.
         * Equal to right-multiply a rotaion matrix
         * @param {number} rad
         * @return {qtek.math.Matrix4}
         */
        rotateZ: function(rad) {
            mat4.rotateZ(this._array, this._array, rad);
            this._dirty = true;
            return this;
        },

        /**
         * Scale self by s
         * Equal to right-multiply a scale matrix
         * @param  {qtek.math.Vector3}  s
         * @return {qtek.math.Matrix4}
         */
        scale: function(v) {
            mat4.scale(this._array, this._array, v._array);
            this._dirty = true;
            return this;
        },

        /**
         * Translate self by v.
         * Equal to right-multiply a translate matrix
         * @param  {qtek.math.Vector3}  v
         * @return {qtek.math.Matrix4}
         */
        translate: function(v) {
            mat4.translate(this._array, this._array, v._array);
            this._dirty = true;
            return this;
        },

        /**
         * Transpose self, in-place.
         * @return {qtek.math.Matrix2}
         */
        transpose: function() {
            mat4.transpose(this._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Decompose a matrix to SRT
         * @param {qtek.math.Vector3} [scale]
         * @param {qtek.math.Quaternion} rotation
         * @param {qtek.math.Vector} position
         * @see http://msdn.microsoft.com/en-us/library/microsoft.xna.framework.matrix.decompose.aspx
         */
        decomposeMatrix: (function() {

            var x = vec3.create();
            var y = vec3.create();
            var z = vec3.create();

            var m3 = mat3.create();

            return function(scale, rotation, position) {

                var el = this._array;
                vec3.set(x, el[0], el[1], el[2]);
                vec3.set(y, el[4], el[5], el[6]);
                vec3.set(z, el[8], el[9], el[10]);

                var sx = vec3.length(x);
                var sy = vec3.length(y);
                var sz = vec3.length(z);
                if (scale) {
                    scale.x = sx;
                    scale.y = sy;
                    scale.z = sz;
                    scale._dirty = true;
                }

                position.set(el[12], el[13], el[14]);

                mat3.fromMat4(m3, el);
                // Not like mat4, mat3 in glmatrix seems to be row-based
                // Seems fixed in gl-matrix 2.2.2
                // https://github.com/toji/gl-matrix/issues/114
                // mat3.transpose(m3, m3);

                m3[0] /= sx;
                m3[1] /= sx;
                m3[2] /= sx;

                m3[3] /= sy;
                m3[4] /= sy;
                m3[5] /= sy;

                m3[6] /= sz;
                m3[7] /= sz;
                m3[8] /= sz;

                quat.fromMat3(rotation._array, m3);
                quat.normalize(rotation._array, rotation._array);

                rotation._dirty = true;
                position._dirty = true;
            };
        })(),

        toString: function() {
            return '[' + Array.prototype.join.call(this._array, ',') + ']';
        }
    };

    var defineProperty = Object.defineProperty;

    if (defineProperty) {
        var proto = Matrix4.prototype;
        /**
         * Z Axis of local transform
         * @name z
         * @type {qtek.math.Vector3}
         * @memberOf qtek.math.Matrix4
         * @instance
         */
        defineProperty(proto, 'z', {
            get: function () {
                var el = this._array;
                this._axisZ.set(el[8], el[9], el[10]);
                return this._axisZ;
            },
            set: function (v) {
                // TODO Here has a problem
                // If only set an item of vector will not work
                var el = this._array;
                v = v._array;
                el[8] = v[0];
                el[9] = v[1];
                el[10] = v[2];

                this._dirty = true;
            }
        });

        /**
         * Y Axis of local transform
         * @name y
         * @type {qtek.math.Vector3}
         * @memberOf qtek.math.Matrix4
         * @instance
         */
        defineProperty(proto, 'y', {
            get: function () {
                var el = this._array;
                this._axisY.set(el[4], el[5], el[6]);
                return this._axisY;
            },
            set: function (v) {
                var el = this._array;
                v = v._array;
                el[4] = v[0];
                el[5] = v[1];
                el[6] = v[2];

                this._dirty = true;
            }
        });

        /**
         * X Axis of local transform
         * @name x
         * @type {qtek.math.Vector3}
         * @memberOf qtek.math.Matrix4
         * @instance
         */
        defineProperty(proto, 'x', {
            get: function () {
                var el = this._array;
                this._axisX.set(el[0], el[1], el[2]);
                return this._axisX;
            },
            set: function (v) {
                var el = this._array;
                v = v._array;
                el[0] = v[0];
                el[1] = v[1];
                el[2] = v[2];

                this._dirty = true;
            }
        })
    }

    /**
     * @param  {qtek.math.Matrix4} out
     * @param  {qtek.math.Matrix4} a
     * @return {qtek.math.Matrix4}
     */
    Matrix4.adjoint = function(out, a) {
        mat4.adjoint(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix4} out
     * @param  {qtek.math.Matrix4} a
     * @return {qtek.math.Matrix4}
     */
    Matrix4.copy = function(out, a) {
        mat4.copy(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix4} a
     * @return {number}
     */
    Matrix4.determinant = function(a) {
        return mat4.determinant(a._array);
    };

    /**
     * @param  {qtek.math.Matrix4} out
     * @return {qtek.math.Matrix4}
     */
    Matrix4.identity = function(out) {
        mat4.identity(out._array);
        out._dirty = true;
        return out;
    };
    
    /**
     * @param  {qtek.math.Matrix4} out
     * @param  {number}  left
     * @param  {number}  right
     * @param  {number}  bottom
     * @param  {number}  top
     * @param  {number}  near
     * @param  {number}  far
     * @return {qtek.math.Matrix4}
     */
    Matrix4.ortho = function(out, left, right, bottom, top, near, far) {
        mat4.ortho(out._array, left, right, bottom, top, near, far);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix4} out
     * @param  {number}  fovy
     * @param  {number}  aspect
     * @param  {number}  near
     * @param  {number}  far
     * @return {qtek.math.Matrix4}
     */
    Matrix4.perspective = function(out, fovy, aspect, near, far) {
        mat4.perspective(out._array, fovy, aspect, near, far);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix4} out
     * @param  {qtek.math.Vector3} eye
     * @param  {qtek.math.Vector3} center
     * @param  {qtek.math.Vector3} up
     * @return {qtek.math.Matrix4}
     */
    Matrix4.lookAt = function(out, eye, center, up) {
        mat4.lookAt(out._array, eye._array, center._array, up._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix4} out
     * @param  {qtek.math.Matrix4} a
     * @return {qtek.math.Matrix4}
     */
    Matrix4.invert = function(out, a) {
        mat4.invert(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix4} out
     * @param  {qtek.math.Matrix4} a
     * @param  {qtek.math.Matrix4} b
     * @return {qtek.math.Matrix4}
     */
    Matrix4.mul = function(out, a, b) {
        mat4.mul(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };

    /**
     * @method
     * @param  {qtek.math.Matrix4} out
     * @param  {qtek.math.Matrix4} a
     * @param  {qtek.math.Matrix4} b
     * @return {qtek.math.Matrix4}
     */
    Matrix4.multiply = Matrix4.mul;

    /**
     * @param  {qtek.math.Matrix4}    out
     * @param  {qtek.math.Quaternion} q
     * @return {qtek.math.Matrix4}
     */
    Matrix4.fromQuat = function(out, q) {
        mat4.fromQuat(out._array, q._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix4}    out
     * @param  {qtek.math.Quaternion} q
     * @param  {qtek.math.Vector3}    v
     * @return {qtek.math.Matrix4}
     */
    Matrix4.fromRotationTranslation = function(out, q, v) {
        mat4.fromRotationTranslation(out._array, q._array, v._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix4} m4
     * @param  {qtek.math.Matrix2d} m2d
     * @return {qtek.math.Matrix4}
     */
    Matrix4.fromMat2d = function(m4, m2d) {
        m4._dirty = true;
        var m2d = m2d._array;
        var m4 = m4._array;

        m4[0] = m2d[0];
        m4[4] = m2d[2];
        m4[12] = m2d[4];

        m4[1] = m2d[1];
        m4[5] = m2d[3];
        m4[13] = m2d[5];

        return m4;
    };

    /**
     * @param  {qtek.math.Matrix4} out
     * @param  {qtek.math.Matrix4} a
     * @param  {number}  rad
     * @param  {qtek.math.Vector3} axis
     * @return {qtek.math.Matrix4}
     */
    Matrix4.rotate = function(out, a, rad, axis) {
        mat4.rotate(out._array, a._array, rad, axis._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix4} out
     * @param  {qtek.math.Matrix4} a
     * @param  {number}  rad
     * @return {qtek.math.Matrix4}
     */
    Matrix4.rotateX = function(out, a, rad) {
        mat4.rotateX(out._array, a._array, rad);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix4} out
     * @param  {qtek.math.Matrix4} a
     * @param  {number}  rad
     * @return {qtek.math.Matrix4}
     */
    Matrix4.rotateY = function(out, a, rad) {
        mat4.rotateY(out._array, a._array, rad);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix4} out
     * @param  {qtek.math.Matrix4} a
     * @param  {number}  rad
     * @return {qtek.math.Matrix4}
     */
    Matrix4.rotateZ = function(out, a, rad) {
        mat4.rotateZ(out._array, a._array, rad);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix4} out
     * @param  {qtek.math.Matrix4} a
     * @param  {qtek.math.Vector3} v
     * @return {qtek.math.Matrix4}
     */
    Matrix4.scale = function(out, a, v) {
        mat4.scale(out._array, a._array, v._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix4} out
     * @param  {qtek.math.Matrix4} a
     * @return {qtek.math.Matrix4}
     */
    Matrix4.transpose = function(out, a) {
        mat4.transpose(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix4} out
     * @param  {qtek.math.Matrix4} a
     * @param  {qtek.math.Vector3} v
     * @return {qtek.math.Matrix4}
     */
    Matrix4.translate = function(out, a, v) {
        mat4.translate(out._array, a._array, v._array);
        out._dirty = true;
        return out;
    };

    return Matrix4;
});