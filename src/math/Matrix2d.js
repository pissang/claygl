define(function(require) {

    'use strict';

    var glMatrix = require("glmatrix");
    var mat2d = glMatrix.mat2d;

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

    var Matrix2d = function() {

        this._array = mat2d.create();
    };

    Matrix2d.prototype = {

        constructor : Matrix2d,

        clone : function() {
            return (new Matrix2d()).copy(this);
        },
        copy : function(b) {
            mat2d.copy(this._array, b._array);
            return this;
        },
        determinant : function() {
            return mat2d.determinant(this._array);
        },
        identity : function() {
            mat2d.identity(this._array);
            return this;
        },
        invert : function() {
            mat2d.invert(this._array, this._array);
            return this;
        },
        mul : function(b) {
            mat2d.mul(this._array, this._array, b._array);
            return this;
        },
        mulLeft : function(b) {
            mat2d.mul(this._array, b._array, this._array);
            return this;
        },
        multiply : function(b) {
            mat2d.multiply(this._array, this._array, b._array);
            return this;
        },
        multiplyLeft : function(b) {
            mat2d.multiply(this._array, b._array, this._array);
            return this;
        },
        rotate : function(rad) {
            mat2d.rotate(this._array, this._array, rad);
            return this;
        },
        scale : function(s) {
            mat2d.scale(this._array, this._array, s._array);
        },
        translate : function(v) {
            mat2d.translate(this._array, this._array, v._array);
        },
        toString : function() {
            return "[" + Array.prototype.join.call(this._array, ",") + "]";
        }
    }

    Matrix2d.adjoint = function(out, a) {
        mat2d.adjoint(out._array, a._array);
        return out;
    }

    Matrix2d.copy = function(out, a) {
        mat2d.copy(out._array, a._array);
        return out;
    }

    Matrix2d.determinant = function(a) {
        return mat2d.determinant(a._array);
    }

    Matrix2d.identity = function(out) {
        mat2d.identity(out._array);
        return out;
    }

    Matrix2d.invert = function(out, a) {
        mat2d.invert(out._array, a._array);
        return out;
    }

    Matrix2d.mul = function(out, a, b) {
        mat2d.mul(out._array, a._array, b._array);
        return out;
    }

    Matrix2d.multiply = Matrix2d.mul;

    Matrix2d.rotate = function(out, a, rad) {
        mat2d.rotate(out._array, a._array, rad);
        return out;
    }

    Matrix2d.scale = function(out, a, v) {
        mat2d.scale(out._array, a._array, v._array);
        return out;
    }

    Matrix2d.translate = function(out, a, v) {
        mat2d.translate(out._array, a._array, v._array);
        return out;
    }

    return Matrix2d;
})