define(function(require) {

    'use strict';

    var glMatrix = require("glmatrix");
    var mat2 = glMatrix.mat2;

    function makeProperty(n) {
        return {
            configurable : false,
            set : function(value) {
                this._array[n] = value;
                this._dirty = true;
            },
            get : function() {
                return this._array[n];
            }
        }
    }

    /**
     * @constructor qtek.math.Matrix2
     */
    var Matrix2 = function() {

        this._array = mat2.create();

        this._dirty = true;
    };

    Matrix2.prototype = {

        constructor : Matrix2,

        clone : function() {
            return (new Matrix2()).copy(this);
        },
        copy : function(b) {
            mat2.copy(this._array, b._array);
            this._dirty = true;
            return this;
        },
        adjoint : function() {
            mat2.adjoint(this._array, this._array);
            this._dirty = true;
            return this;
        },
        determinant : function() {
            return mat2.determinant(this._array);
        },
        identity : function() {
            mat2.identity(this._array);
            this._dirty = true;
            return this;
        },
        invert : function() {
            mat2.invert(this._array, this._array);
            this._dirty = true;
            return this;
        },
        mul : function(b) {
            mat2.mul(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },
        mulLeft : function(a) {
            mat2.mul(this._array, a._array, this._array);
            this._dirty = true;
            return this;
        },
        multiply : function(b) {
            mat2.multiply(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },
        multiplyLeft : function(a) {
            mat2.multiply(this._array, a._array, this._array);
            this._dirty = true;
            return this;
        },
        rotate : function(rad) {
            mat2.rotate(this._array, this._array, rad);
            this._dirty = true;
            return this;
        },
        scale : function(v) {
            mat2.scale(this._array, this._array, v._array);
            this._dirty = true;
            return this;
        },
        transpose: function() {
            mat2.transpose(this._array, this._array);
            this._dirty = true;
            return this;
        },
        toString : function() {
            return "[" + Array.prototype.join.call(this._array, ",") + "]";
        }
    }

    Matrix2.adjoint = function(out, a) {
        mat2.adjoint(out._array, a._array);
        out._dirty = true;
        return out;
    }

    Matrix2.copy = function(out, a) {
        mat2.copy(out._array, a._array);
        out._dirty = true;
        return out;
    }

    Matrix2.determinant = function(a) {
        return mat2.determinant(a._array);
    }

    Matrix2.identity = function(out) {
        mat2.identity(out._array);
        out._dirty = true;
        return out;
    }

    Matrix2.invert = function(out, a) {
        mat2.invert(out._array, a._array);
        out._dirty = true;
        return out;
    }

    Matrix2.mul = function(out, a, b) {
        mat2.mul(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    }

    Matrix2.multiply = Matrix2.mul;

    Matrix2.rotate = function(out, a, rad) {
        mat2.rotate(out._array, a._array, rad);
        out._dirty = true;
        return out;
    }

    Matrix2.scale = function(out, a, v) {
        mat2.scale(out._array, a._array, v._array);
        out._dirty = true;
        return out;
    }

    Matrix2.transpose = function(out, a) {
        mat2.transpose(out._array, a._array);
        out._dirty = true;
        return out;
    }

    return Matrix2;
})