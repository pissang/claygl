define(function(require) {

    'use strict';

    var glMatrix = require('../dep/glmatrix');
    var mat2 = glMatrix.mat2;

    var KEY_ARRAY = '_array';
    var KEY_DIRTY = '_dirty';

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
        this[KEY_ARRAY] = mat2.create();

        /**
         * @name _dirty
         * @type {boolean}
         */
        this[KEY_DIRTY] = true;
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
            mat2.copy(this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Calculate the adjugate of self, in-place
         * @return {qtek.math.Matrix2}
         */
        adjoint: function() {
            mat2.adjoint(this[KEY_ARRAY], this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Calculate matrix determinant
         * @return {number}
         */
        determinant: function() {
            return mat2.determinant(this[KEY_ARRAY]);
        },

        /**
         * Set to a identity matrix
         * @return {qtek.math.Matrix2}
         */
        identity: function() {
            mat2.identity(this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Invert self
         * @return {qtek.math.Matrix2}
         */
        invert: function() {
            mat2.invert(this[KEY_ARRAY], this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Alias for mutiply
         * @param  {qtek.math.Matrix2} b
         * @return {qtek.math.Matrix2}
         */
        mul: function(b) {
            mat2.mul(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Alias for multiplyLeft
         * @param  {qtek.math.Matrix2} a
         * @return {qtek.math.Matrix2}
         */
        mulLeft: function(a) {
            mat2.mul(this[KEY_ARRAY], a[KEY_ARRAY], this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Multiply self and b
         * @param  {qtek.math.Matrix2} b
         * @return {qtek.math.Matrix2}
         */
        multiply: function(b) {
            mat2.multiply(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Multiply a and self, a is on the left
         * @param  {qtek.math.Matrix2} a
         * @return {qtek.math.Matrix2}
         */
        multiplyLeft: function(a) {
            mat2.multiply(this[KEY_ARRAY], a[KEY_ARRAY], this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Rotate self by a given radian
         * @param  {number}   rad
         * @return {qtek.math.Matrix2}
         */
        rotate: function(rad) {
            mat2.rotate(this[KEY_ARRAY], this[KEY_ARRAY], rad);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Scale self by s
         * @param  {qtek.math.Vector2}  s
         * @return {qtek.math.Matrix2}
         */
        scale: function(v) {
            mat2.scale(this[KEY_ARRAY], this[KEY_ARRAY], v[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },
        /**
         * Transpose self, in-place.
         * @return {qtek.math.Matrix2}
         */
        transpose: function() {
            mat2.transpose(this[KEY_ARRAY], this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },
        toString: function() {
            return '[' + Array.prototype.join.call(this[KEY_ARRAY], ',') + ']';
        }
    };

    /**
     * @param  {Matrix2} out
     * @param  {Matrix2} a
     * @return {Matrix2}
     */
    Matrix2.adjoint = function(out, a) {
        mat2.adjoint(out[KEY_ARRAY], a[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix2} out
     * @param  {qtek.math.Matrix2} a
     * @return {qtek.math.Matrix2}
     */
    Matrix2.copy = function(out, a) {
        mat2.copy(out[KEY_ARRAY], a[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix2} a
     * @return {number}
     */
    Matrix2.determinant = function(a) {
        return mat2.determinant(a[KEY_ARRAY]);
    };

    /**
     * @param  {qtek.math.Matrix2} out
     * @return {qtek.math.Matrix2}
     */
    Matrix2.identity = function(out) {
        mat2.identity(out[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix2} out
     * @param  {qtek.math.Matrix2} a
     * @return {qtek.math.Matrix2}
     */
    Matrix2.invert = function(out, a) {
        mat2.invert(out[KEY_ARRAY], a[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix2} out
     * @param  {qtek.math.Matrix2} a
     * @param  {qtek.math.Matrix2} b
     * @return {qtek.math.Matrix2}
     */
    Matrix2.mul = function(out, a, b) {
        mat2.mul(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
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
        mat2.rotate(out[KEY_ARRAY], a[KEY_ARRAY], rad);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix2} out
     * @param  {qtek.math.Matrix2} a
     * @param  {qtek.math.Vector2}  v
     * @return {qtek.math.Matrix2}
     */
    Matrix2.scale = function(out, a, v) {
        mat2.scale(out[KEY_ARRAY], a[KEY_ARRAY], v[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };
    /**
     * @param  {Matrix2} out
     * @param  {Matrix2} a
     * @return {Matrix2}
     */
    Matrix2.transpose = function(out, a) {
        mat2.transpose(out[KEY_ARRAY], a[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    return Matrix2;
});