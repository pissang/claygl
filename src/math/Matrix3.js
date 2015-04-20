define(function(require) {

    'use strict';

    var glMatrix = require('../dep/glmatrix');
    var mat3 = glMatrix.mat3;

    var KEY_ARRAY = '_array';
    var KEY_DIRTY = '_dirty';

    /**
     * @constructor
     * @alias qtek.math.Matrix3
     */
    var Matrix3 = function() {

        /**
         * Storage of Matrix3
         * @name _array
         * @type {Float32Array}
         */
        this[KEY_ARRAY] = mat3.create();

        /**
         * @name _dirty
         * @type {boolean}
         */
        this[KEY_DIRTY] = true;
    };

    Matrix3.prototype = {

        constructor: Matrix3,

        /**
         * Calculate the adjugate of self, in-place
         * @return {qtek.math.Matrix3}
         */
        adjoint: function() {
            mat3.adjoint(this[KEY_ARRAY], this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Clone a new Matrix3
         * @return {qtek.math.Matrix3}
         */
        clone: function() {
            return (new Matrix3()).copy(this);
        },

        /**
         * Copy from b
         * @param  {qtek.math.Matrix3} b
         * @return {qtek.math.Matrix3}
         */
        copy: function(b) {
            mat3.copy(this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Calculate matrix determinant
         * @return {number}
         */
        determinant: function() {
            return mat3.determinant(this[KEY_ARRAY]);
        },

        /**
         * Copy the values from Matrix2d a
         * @param  {qtek.math.Matrix2d} a
         * @return {qtek.math.Matrix3}
         */
        fromMat2d: function(a) {
            mat3.fromMat2d(this[KEY_ARRAY], a[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Copies the upper-left 3x3 values of Matrix4
         * @param  {qtek.math.Matrix4} a
         * @return {qtek.math.Matrix3}
         */
        fromMat4: function(a) {
            mat3.fromMat4(this[KEY_ARRAY], a[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Calculates a rotation matrix from the given quaternion
         * @param  {qtek.math.Quaternion} q
         * @return {qtek.math.Matrix3}
         */
        fromQuat: function(q) {
            mat3.fromQuat(this[KEY_ARRAY], q[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Set to a identity matrix
         * @return {qtek.math.Matrix3}
         */
        identity: function() {
            mat3.identity(this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Invert self
         * @return {qtek.math.Matrix3}
         */
        invert: function() {
            mat3.invert(this[KEY_ARRAY], this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Alias for mutiply
         * @param  {qtek.math.Matrix3} b
         * @return {qtek.math.Matrix3}
         */
        mul: function(b) {
            mat3.mul(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Alias for multiplyLeft
         * @param  {qtek.math.Matrix3} a
         * @return {qtek.math.Matrix3}
         */
        mulLeft: function(a) {
            mat3.mul(this[KEY_ARRAY], a[KEY_ARRAY], this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Multiply self and b
         * @param  {qtek.math.Matrix3} b
         * @return {qtek.math.Matrix3}
         */
        multiply: function(b) {
            mat3.multiply(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Multiply a and self, a is on the left
         * @param  {qtek.math.Matrix3} a
         * @return {qtek.math.Matrix3}
         */
        multiplyLeft: function(a) {
            mat3.multiply(this[KEY_ARRAY], a[KEY_ARRAY], this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Rotate self by a given radian
         * @param  {number}   rad
         * @return {qtek.math.Matrix3}
         */
        rotate: function(rad) {
            mat3.rotate(this[KEY_ARRAY], this[KEY_ARRAY], rad);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Scale self by s
         * @param  {qtek.math.Vector2}  s
         * @return {qtek.math.Matrix3}
         */
        scale: function(v) {
            mat3.scale(this[KEY_ARRAY], this[KEY_ARRAY], v[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Translate self by v
         * @param  {qtek.math.Vector2}  v
         * @return {qtek.math.Matrix3}
         */
        translate: function(v) {
            mat3.translate(this[KEY_ARRAY], this[KEY_ARRAY], v[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },
        /**
         * Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
         * @param {qtek.math.Matrix4} a
         */
        normalFromMat4: function(a) {
            mat3.normalFromMat4(this[KEY_ARRAY], a[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Transpose self, in-place.
         * @return {qtek.math.Matrix2}
         */
        transpose: function() {
            mat3.transpose(this[KEY_ARRAY], this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },
        toString: function() {
            return '[' + Array.prototype.join.call(this[KEY_ARRAY], ',') + ']';
        }
    };
    /**
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix3} a
     * @return {qtek.math.Matrix3}
     */
    Matrix3.adjoint = function(out, a) {
        mat3.adjoint(out[KEY_ARRAY], a[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix3} a
     * @return {qtek.math.Matrix3}
     */
    Matrix3.copy = function(out, a) {
        mat3.copy(out[KEY_ARRAY], a[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3} a
     * @return {number}
     */
    Matrix3.determinant = function(a) {
        return mat3.determinant(a[KEY_ARRAY]);
    };

    /**
     * @param  {qtek.math.Matrix3} out
     * @return {qtek.math.Matrix3}
     */
    Matrix3.identity = function(out) {
        mat3.identity(out[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix3} a
     * @return {qtek.math.Matrix3}
     */
    Matrix3.invert = function(out, a) {
        mat3.invert(out[KEY_ARRAY], a[KEY_ARRAY]);
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix3} a
     * @param  {qtek.math.Matrix3} b
     * @return {qtek.math.Matrix3}
     */
    Matrix3.mul = function(out, a, b) {
        mat3.mul(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @method
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix3} a
     * @param  {qtek.math.Matrix3} b
     * @return {qtek.math.Matrix3}
     */
    Matrix3.multiply = Matrix3.mul;
    
    /**
     * @param  {qtek.math.Matrix3}  out
     * @param  {qtek.math.Matrix2d} a
     * @return {qtek.math.Matrix3}
     */
    Matrix3.fromMat2d = function(out, a) {
        mat3.fromMat2d(out[KEY_ARRAY], a[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix4} a
     * @return {qtek.math.Matrix3}
     */
    Matrix3.fromMat4 = function(out, a) {
        mat3.fromMat4(out[KEY_ARRAY], a[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3}    out
     * @param  {qtek.math.Quaternion} a
     * @return {qtek.math.Matrix3}
     */
    Matrix3.fromQuat = function(out, q) {
        mat3.fromQuat(out[KEY_ARRAY], q[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix4} a
     * @return {qtek.math.Matrix3}
     */
    Matrix3.normalFromMat4 = function(out, a) {
        mat3.normalFromMat4(out[KEY_ARRAY], a[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix3} a
     * @param  {number}  rad
     * @return {qtek.math.Matrix3}
     */
    Matrix3.rotate = function(out, a, rad) {
        mat3.rotate(out[KEY_ARRAY], a[KEY_ARRAY], rad);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix3} a
     * @param  {qtek.math.Vector2} v
     * @return {qtek.math.Matrix3}
     */
    Matrix3.scale = function(out, a, v) {
        mat3.scale(out[KEY_ARRAY], a[KEY_ARRAY], v[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix3} a
     * @return {qtek.math.Matrix3}
     */
    Matrix3.transpose = function(out, a) {
        mat3.transpose(out[KEY_ARRAY], a[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix3} a
     * @param  {qtek.math.Vector2} v
     * @return {qtek.math.Matrix3}
     */
    Matrix3.translate = function(out, a, v) {
        mat3.translate(out[KEY_ARRAY], a[KEY_ARRAY], v[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    return Matrix3;
});