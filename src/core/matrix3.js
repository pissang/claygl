define(function(require) {

    var glMatrix = require("glmatrix");
    var mat3 = glMatrix.mat3;

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

    var Matrix3 = function() {

        return Object.create(Matrix3Proto, {

            m00 : makeProperty(0),
            m01 : makeProperty(1),
            m02 : makeProperty(2),
            m10 : makeProperty(3),
            m11 : makeProperty(4),
            m12 : makeProperty(5),
            m20 : makeProperty(6),
            m21 : makeProperty(7),
            m22 : makeProperty(8),
            
            _array : {
                writable : false,
                configurable : false,
                value : mat3.create()
            }
        })
    };

    var Matrix3Proto = {

        constructor : Matrix3,

        adjoint : function() {
            mat3.adjoint(this._array, this._array);
            return this;
        },
        clone : function() {
            return (new Matrix3()).copy(this);
        },
        copy : function(b) {
            mat3.copy(this._array, b._array);
            return this;
        },
        determinant : function() {
            return mat3.determinant(this._array);
        },
        fromMat2d : function(a) {
            return mat3.fromMat2d(this._array, a._array);
        },
        fromMat4 : function(a) {
            return mat3.fromMat4(this._array, a._array);
        },
        fromQuat : function(q) {
            mat3.fromQuat(this._array, q._array);
            return this;
        },
        identity : function() {
            mat3.identity(this._array);
            return this;
        },
        invert : function() {
            mat3.invert(this._array, this._array);
            return this;
        },
        mul : function(b) {
            mat3.mul(this._array, this._array, b._array);
            return this;
        },
        mulLeft : function(b) {
            mat3.mul(this._array, b._array, this._array);
            return this;
        },
        multiply : function(b) {
            mat3.multiply(this._array, this._array, b._array);
            return this;
        },
        multiplyLeft : function(b) {
            mat3.multiply(this._array, b._array, this._array);
            return this;
        },
        /**
         * Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
         */
        normalFromMat4 : function(a) {
            mat3.normalFromMat4(this._array, a._array);
            return this;
        },
        transpose : function() {
            mat3.transpose(this._array, this._array);
            return this;
        },
        toString : function() {
            return "[" + Array.prototype.join.call(this._array, ",") + "]";
        }
    }

    return Matrix3;
})