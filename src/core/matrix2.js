define(function(require) {

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

    var Matrix2 = function() {

        return Object.create(Matrix2Proto, {

            m00 : makeProperty(0),
            m01 : makeProperty(1),
            m10 : makeProperty(2),
            m11 : makeProperty(3),
            
            _array : {
                writable : false,
                configurable : false,
                value : mat2.create()
            }
        })
    };

    var Matrix2Proto = {

        constructor : Matrix2,

        clone : function() {
            return (new Matrix2()).copy(this);
        },
        copy : function(b) {
            mat2.copy(this._array, b._array);
            return this;
        },
        adjoint : function() {
            mat2.adjoint(this._array, this._array);
            return this;
        },
        determinant : function() {
            return mat2.determinant(this._array);
        },
        identity : function() {
            mat2.identity(this._array);
            return this;
        },
        invert : function() {
            mat2.invert(this._array, this._array);
            return this;
        },
        mul : function(b) {
            mat2.mul(this._array, this._array, b._array);
            return this;
        },
        mulLeft : function(b) {
            mat2.mul(this._array, b._array, this._array);
            return this;
        },
        multiply : function(b) {
            mat2.multiply(this._array, this._array, b._array);
            return this;
        },
        multiplyLeft : function(b) {
            mat2.multiply(this._array, b._array, this._array);
            return this;
        },
        rotate : function(rad) {
            mat2.rotate(this._array, this._array, rad);
            return this;
        },
        scale : function(s) {
            mat2.scale(this._array, this._array, s);
        },
        toString : function() {
            return "[" + Array.prototype.join.call(this._array, ",") + "]";
        }
    }

    return Matrix2;
})