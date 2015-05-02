define(function(require) {

    'use strict';

    var glMatrix = require('../dep/glmatrix');
    var mat2d = glMatrix.mat2d;

    /**
     * @constructor
     * @alias qtek.math.Matrix2d
     */
    var Matrix2d = function() {
        /**
         * Storage of Matrix2d
         * @name _array
         * @type {Float32Array}
         */
        this._array = mat2d.create();

        /**
         * @name _dirty
         * @type {boolean}
         */
        this._dirty = true;
    };

    Matrix2d.prototype = {

        constructor: Matrix2d,

        /**
         * Clone a new Matrix2d
         * @return {qtek.math.Matrix2d}
         */
        clone: function() {
            return (new Matrix2d()).copy(this);
        },

        /**
         * Copy from b
         * @param  {qtek.math.Matrix2d} b
         * @return {qtek.math.Matrix2d}
         */
        copy: function(b) {
            mat2d.copy(this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Calculate matrix determinant
         * @return {number}
         */
        determinant: function() {
            return mat2d.determinant(this._array);
        },

        /**
         * Set to a identity matrix
         * @return {qtek.math.Matrix2d}
         */
        identity: function() {
            mat2d.identity(this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Invert self
         * @return {qtek.math.Matrix2d}
         */
        invert: function() {
            mat2d.invert(this._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Alias for mutiply
         * @param  {qtek.math.Matrix2d} b
         * @return {qtek.math.Matrix2d}
         */
        mul: function(b) {
            mat2d.mul(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Alias for multiplyLeft
         * @param  {qtek.math.Matrix2d} a
         * @return {qtek.math.Matrix2d}
         */
        mulLeft: function(b) {
            mat2d.mul(this._array, b._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Multiply self and b
         * @param  {qtek.math.Matrix2d} b
         * @return {qtek.math.Matrix2d}
         */
        multiply: function(b) {
            mat2d.multiply(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Multiply a and self, a is on the left
         * @param  {qtek.math.Matrix2d} a
         * @return {qtek.math.Matrix2d}
         */
        multiplyLeft: function(b) {
            mat2d.multiply(this._array, b._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Rotate self by a given radian
         * @param  {number}   rad
         * @return {qtek.math.Matrix2d}
         */
        rotate: function(rad) {
            mat2d.rotate(this._array, this._array, rad);
            this._dirty = true;
            return this;
        },

        /**
         * Scale self by s
         * @param  {qtek.math.Vector2}  s
         * @return {qtek.math.Matrix2d}
         */
        scale: function(s) {
            mat2d.scale(this._array, this._array, s._array);
            this._dirty = true;
            return this;
        },

        /**
         * Translate self by v
         * @param  {qtek.math.Vector2}  v
         * @return {qtek.math.Matrix2d}
         */
        translate: function(v) {
            mat2d.translate(this._array, this._array, v._array);
            this._dirty = true;
            return this;
        },
        toString: function() {
            return '[' + Array.prototype.join.call(this._array, ',') + ']';
        }
    };

    /**
     * @param  {qtek.math.Matrix2d} out
     * @param  {qtek.math.Matrix2d} a
     * @return {qtek.math.Matrix2d}
     */
    Matrix2d.copy = function(out, a) {
        mat2d.copy(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix2d} a
     * @return {number}
     */
    Matrix2d.determinant = function(a) {
        return mat2d.determinant(a._array);
    };

    /**
     * @param  {qtek.math.Matrix2d} out
     * @return {qtek.math.Matrix2d}
     */
    Matrix2d.identity = function(out) {
        mat2d.identity(out._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix2d} out
     * @param  {qtek.math.Matrix2d} a
     * @return {qtek.math.Matrix2d}
     */
    Matrix2d.invert = function(out, a) {
        mat2d.invert(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix2d} out
     * @param  {qtek.math.Matrix2d} a
     * @param  {qtek.math.Matrix2d} b
     * @return {qtek.math.Matrix2d}
     */
    Matrix2d.mul = function(out, a, b) {
        mat2d.mul(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };

    /**
     * @method
     * @param  {qtek.math.Matrix2d} out
     * @param  {qtek.math.Matrix2d} a
     * @param  {qtek.math.Matrix2d} b
     * @return {qtek.math.Matrix2d}
     */
    Matrix2d.multiply = Matrix2d.mul;

    /**
     * @param  {qtek.math.Matrix2d} out
     * @param  {qtek.math.Matrix2d} a
     * @param  {number}   rad
     * @return {qtek.math.Matrix2d}
     */
    Matrix2d.rotate = function(out, a, rad) {
        mat2d.rotate(out._array, a._array, rad);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix2d} out
     * @param  {qtek.math.Matrix2d} a
     * @param  {qtek.math.Vector2}  v
     * @return {qtek.math.Matrix2d}
     */
    Matrix2d.scale = function(out, a, v) {
        mat2d.scale(out._array, a._array, v._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Matrix2d} out
     * @param  {qtek.math.Matrix2d} a
     * @param  {qtek.math.Vector2}  v
     * @return {qtek.math.Matrix2d}
     */
    Matrix2d.translate = function(out, a, v) {
        mat2d.translate(out._array, a._array, v._array);
        out._dirty = true;
        return out;
    };

    return Matrix2d;
});