define(function(require) {

    'use strict';

    var glMatrix = require('../dep/glmatrix');
    var mat2 = glMatrix.mat2;

    /**
     * @constructor
     * @alias qtek.math.Matrix2
     */
    var Matrix2 = function() {

        /**
         * Storage of Matrix2
         * @name _array
         * @type {Float32Array}
         */
        this._array = mat2.create();

        /**
         * @name _dirty
         * @type {boolean}
         */
        this._dirty = true;
    };

    Matrix2.prototype = {

        constructor: Matrix2,

        /**
         * Clone a new Matrix2
         * @return {qtek.math.Matrix2}
         */
        clone: function() {
            return (new Matrix2()).copy(this);
        },

        /**
         * Copy from b
         * @param  {qtek.math.Matrix2} b
         * @return {qtek.math.Matrix2}
         */
        copy: function(b) {
            mat2.copy(this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Calculate the adjugate of self, in-place
         * @return {qtek.math.Matrix2}
         */
        adjoint: function() {
            mat2.adjoint(this._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Calculate matrix determinant
         * @return {number}
         */
        determinant: function() {
            return mat2.determinant(this._array);
        },

        /**
         * Set to a identity matrix
         * @return {qtek.math.Matrix2}
         */
        identity: function() {
            mat2.identity(this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Invert self
         * @return {qtek.math.Matrix2}
         */
        invert: function() {
            mat2.invert(this._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Alias for mutiply
         * @param  {qtek.math.Matrix2} b
         * @return {qtek.math.Matrix2}
         */
        mul: function(b) {
            mat2.mul(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Alias for multiplyLeft
         * @param  {qtek.math.Matrix2} a
         * @return {qtek.math.Matrix2}
         */
        mulLeft: function(a) {
            mat2.mul(this._array, a._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Multiply self and b
         * @param  {qtek.math.Matrix2} b
         * @return {qtek.math.Matrix2}
         */
        multiply: function(b) {
            mat2.multiply(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Multiply a and self, a is on the left
         * @param  {qtek.math.Matrix2} a
         * @return {qtek.math.Matrix2}
         */
        multiplyLeft: function(a) {
            mat2.multiply(this._array, a._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Rotate self by a given radian
         * @param  {number}   rad
         * @return {qtek.math.Matrix2}
         */
        rotate: function(rad) {
            mat2.rotate(this._array, this._array, rad);
            this._dirty = true;
            return this;
        },

        /**
         * Scale self by s
         * @param  {qtek.math.Vector2}  s
         * @return {qtek.math.Matrix2}
         */
        scale: function(v) {
            mat2.scale(this._array, this._array, v._array);
            this._dirty = true;
            return this;
        },
        /**
         * Transpose self, in-place.
         * @return {qtek.math.Matrix2}
         */
        transpose: function() {
            mat2.transpose(this._array, this._array);
            this._dirty = true;
            return this;
        },
        toString: function() {
            return '[' + Array.prototype.join.call(this._array, ',') + ']';
        }
    };

    /**
     * @param  {Matrix2} out
     * @param  {Matrix2} a
     * @return {Matrix2}
     */
    Matrix2.adjoint = function(out, a) {
        mat2.adjoint(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix2} out
     * @param  {qtek.math.Matrix2} a
     * @return {qtek.math.Matrix2}
     */
    Matrix2.copy = function(out, a) {
        mat2.copy(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix2} a
     * @return {number}
     */
    Matrix2.determinant = function(a) {
        return mat2.determinant(a._array);
    };

    /**
     * @param  {qtek.math.Matrix2} out
     * @return {qtek.math.Matrix2}
     */
    Matrix2.identity = function(out) {
        mat2.identity(out._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix2} out
     * @param  {qtek.math.Matrix2} a
     * @return {qtek.math.Matrix2}
     */
    Matrix2.invert = function(out, a) {
        mat2.invert(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix2} out
     * @param  {qtek.math.Matrix2} a
     * @param  {qtek.math.Matrix2} b
     * @return {qtek.math.Matrix2}
     */
    Matrix2.mul = function(out, a, b) {
        mat2.mul(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };

    /**
     * @method
     * @param  {qtek.math.Matrix2} out
     * @param  {qtek.math.Matrix2} a
     * @param  {qtek.math.Matrix2} b
     * @return {qtek.math.Matrix2}
     */
    Matrix2.multiply = Matrix2.mul;

    /**
     * @param  {qtek.math.Matrix2} out
     * @param  {qtek.math.Matrix2} a
     * @param  {number}   rad
     * @return {qtek.math.Matrix2}
     */
    Matrix2.rotate = function(out, a, rad) {
        mat2.rotate(out._array, a._array, rad);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix2} out
     * @param  {qtek.math.Matrix2} a
     * @param  {qtek.math.Vector2}  v
     * @return {qtek.math.Matrix2}
     */
    Matrix2.scale = function(out, a, v) {
        mat2.scale(out._array, a._array, v._array);
        out._dirty = true;
        return out;
    };
    /**
     * @param  {Matrix2} out
     * @param  {Matrix2} a
     * @return {Matrix2}
     */
    Matrix2.transpose = function(out, a) {
        mat2.transpose(out._array, a._array);
        out._dirty = true;
        return out;
    };

    return Matrix2;
});