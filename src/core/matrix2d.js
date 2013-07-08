define( function(require){

    var glMatrix = require("glmatrix");
    var mat2d = glMatrix.mat2d;

    function makeProperty(n){
        return {
            configurable : false,
            set : function(value){
                this._array[n] = value;
                this._dirty = true;
            },
            get : function(){
                return this._array[n];
            }
        }
    }

    var Matrix2d = function(){

        return Object.create(Matrix2dProto, {

            m00 : makeProperty(0),
            m01 : makeProperty(1),
            m10 : makeProperty(2),
            m11 : makeProperty(3),
            m20 : makeProperty(4),
            m21 : makeProperty(5),
            
            _array : {
                writable : false,
                configurable : false,
                value : mat2d.create()
            }
        })
    };

    var Matrix2dProto = {

        constructor : Matrix2d,

        clone : function(){
            return (new Matrix2d()).copy(this);
        },
        copy : function(b){
            mat2d.copy(this._array, b._array);
            return this;
        },
        determinant : function(){
            return mat2d.determinant(this._array);
        },
        identity : function(){
            mat2d.identity(this._array);
            return this;
        },
        invert : function(){
            mat2d.invert(this._array, this._array);
            return this;
        },
        mul : function(b){
            mat2d.mul(this._array, this._array, b._array);
            return this;
        },
        mulLeft : function(b){
            mat2d.mul(this._array, b._array, this._array);
            return this;
        },
        multiply : function(b){
            mat2d.multiply(this._array, this._array, b._array);
            return this;
        },
        multiplyLeft : function(b){
            mat2d.multiply(this._array, b._array, this._array);
            return this;
        },
        rotate : function(rad){
            mat2d.rotate(this._array, this._array, rad);
            return this;
        },
        scale : function(s){
            mat2d.scale(this._array, this._array, s._array);
        },
        translate : function(v){
            mat2d.translate(this._array, this._array, v._array);
        },
        toString : function(){
            return "[" + Array.prototype.join.call(this._array, ",") + "]";
        }
    }

    return Matrix2d;
})