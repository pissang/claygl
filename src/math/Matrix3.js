define(function(require) {

    'use strict';

    var glMatrix = require('../dep/glmatrix');
    var mat3 = glMatrix.mat3;

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
        this._array = mat3.create();

        /**
         * @name _dirty
         * @type {boolean}
         */
        this._dirty = true;
    };

    Matrix3.prototype = {

        constructor: Matrix3,

        /**
         * Calculate the adjugate of self, in-place
         * @return {qtek.math.Matrix3}
         */
        adjoint: function() {
            mat3.adjoint(this._array, this._array);
            this._dirty = true;
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
            mat3.copy(this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Calculate matrix determinant
         * @return {number}
         */
        determinant: function() {
            return mat3.determinant(this._array);
        },

        /**
         * Copy the values from Matrix2d a
         * @param  {qtek.math.Matrix2d} a
         * @return {qtek.math.Matrix3}
         */
        fromMat2d: function(a) {
            mat3.fromMat2d(this._array, a._array);
            this._dirty = true;
            return this;
        },

        /**
         * Copies the upper-left 3x3 values of Matrix4
         * @param  {qtek.math.Matrix4} a
         * @return {qtek.math.Matrix3}
         */
        fromMat4: function(a) {
            mat3.fromMat4(this._array, a._array);
            this._dirty = true;
            return this;
        },

        /**
         * Calculates a rotation matrix from the given quaternion
         * @param  {qtek.math.Quaternion} q
         * @return {qtek.math.Matrix3}
         */
        fromQuat: function(q) {
            mat3.fromQuat(this._array, q._array);
            this._dirty = true;
            return this;
        },

        /**
         * Set to a identity matrix
         * @return {qtek.math.Matrix3}
         */
        identity: function() {
            mat3.identity(this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Invert self
         * @return {qtek.math.Matrix3}
         */
        invert: function() {
            mat3.invert(this._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Alias for mutiply
         * @param  {qtek.math.Matrix3} b
         * @return {qtek.math.Matrix3}
         */
        mul: function(b) {
            mat3.mul(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Alias for multiplyLeft
         * @param  {qtek.math.Matrix3} a
         * @return {qtek.math.Matrix3}
         */
        mulLeft: function(a) {
            mat3.mul(this._array, a._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Multiply self and b
         * @param  {qtek.math.Matrix3} b
         * @return {qtek.math.Matrix3}
         */
        multiply: function(b) {
            mat3.multiply(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Multiply a and self, a is on the left
         * @param  {qtek.math.Matrix3} a
         * @return {qtek.math.Matrix3}
         */
        multiplyLeft: function(a) {
            mat3.multiply(this._array, a._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Rotate self by a given radian
         * @param  {number}   rad
         * @return {qtek.math.Matrix3}
         */
        rotate: function(rad) {
            mat3.rotate(this._array, this._array, rad);
            this._dirty = true;
            return this;
        },

        /**
         * Scale self by s
         * @param  {qtek.math.Vector2}  s
         * @return {qtek.math.Matrix3}
         */
        scale: function(v) {
            mat3.scale(this._array, this._array, v._array);
            this._dirty = true;
            return this;
        },

        /**
         * Translate self by v
         * @param  {qtek.math.Vector2}  v
         * @return {qtek.math.Matrix3}
         */
        translate: function(v) {
            mat3.translate(this._array, this._array, v._array);
            this._dirty = true;
            return this;
        },
        /**
         * Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
         * @param {qtek.math.Matrix4} a
         */
        normalFromMat4: function(a) {
            mat3.normalFromMat4(this._array, a._array);
            this._dirty = true;
            return this;
        },

        /**
         * Transpose self, in-place.
         * @return {qtek.math.Matrix2}
         */
        transpose: function() {
            mat3.transpose(this._array, this._array);
            this._dirty = true;
            return this;
        },
        toString: function() {
            return '[' + Array.prototype.join.call(this._array, ',') + ']';
        }
    };
    /**
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix3} a
     * @return {qtek.math.Matrix3}
     */
    Matrix3.adjoint = function(out, a) {
        mat3.adjoint(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix3} a
     * @return {qtek.math.Matrix3}
     */
    Matrix3.copy = function(out, a) {
        mat3.copy(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3} a
     * @return {number}
     */
    Matrix3.determinant = function(a) {
        return mat3.determinant(a._array);
    };

    /**
     * @param  {qtek.math.Matrix3} out
     * @return {qtek.math.Matrix3}
     */
    Matrix3.identity = function(out) {
        mat3.identity(out._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix3} a
     * @return {qtek.math.Matrix3}
     */
    Matrix3.invert = function(out, a) {
        mat3.invert(out._array, a._array);
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix3} a
     * @param  {qtek.math.Matrix3} b
     * @return {qtek.math.Matrix3}
     */
    Matrix3.mul = function(out, a, b) {
        mat3.mul(out._array, a._array, b._array);
        out._dirty = true;
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
        mat3.fromMat2d(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix4} a
     * @return {qtek.math.Matrix3}
     */
    Matrix3.fromMat4 = function(out, a) {
        mat3.fromMat4(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3}    out
     * @param  {qtek.math.Quaternion} a
     * @return {qtek.math.Matrix3}
     */
    Matrix3.fromQuat = function(out, q) {
        mat3.fromQuat(out._array, q._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix4} a
     * @return {qtek.math.Matrix3}
     */
    Matrix3.normalFromMat4 = function(out, a) {
        mat3.normalFromMat4(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix3} a
     * @param  {number}  rad
     * @return {qtek.math.Matrix3}
     */
    Matrix3.rotate = function(out, a, rad) {
        mat3.rotate(out._array, a._array, rad);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix3} a
     * @param  {qtek.math.Vector2} v
     * @return {qtek.math.Matrix3}
     */
    Matrix3.scale = function(out, a, v) {
        mat3.scale(out._array, a._array, v._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix3} a
     * @return {qtek.math.Matrix3}
     */
    Matrix3.transpose = function(out, a) {
        mat3.transpose(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix3} out
     * @param  {qtek.math.Matrix3} a
     * @param  {qtek.math.Vector2} v
     * @return {qtek.math.Matrix3}
     */
    Matrix3.translate = function(out, a, v) {
        mat3.translate(out._array, a._array, v._array);
        out._dirty = true;
        return out;
    };

    return Matrix3;
});