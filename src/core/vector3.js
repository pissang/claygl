define( function(require){

    var glMatrix = require("glmatrix");
    var vec3 = glMatrix.vec3;

    var Vector3 = function(x, y, z){
        
        x = x || 0;
        y = y || 0;
        z = z || 0;
        
        return Object.create(Vector3Proto, {

            x : {
                configurable : false,
                set : function(value){
                    this._array[0] = value;
                    this._dirty = true;
                },
                get : function(){
                    return this._array[0];
                }
            },
            y : {
                configurable : false,
                set : function(value){
                    this._array[1] = value;
                    this._dirty = true;
                },
                get : function(){
                    return this._array[1];
                }
            },
            z : {
                configurable : false,
                set : function(value){
                    this._array[2] = value;
                    this._dirty = true;
                },
                get : function(){
                    return this._array[2];
                }
            },

            _array :{
                writable : false,
                configurable : false,
                value : vec3.fromValues(x, y, z)
            },
            // Dirty flag is used by the Node to determine
            // if the matrix is updated to latest
            _dirty : {
                configurable : false,
                value : true
            }
        })

    }

    var Vector3Proto = {

        constructor : Vector3,

        add : function(b){
            vec3.add( this._array, this._array, b._array );
            this._dirty = true;
            return this;
        },

        set : function(x, y, z){
            this._array[0] = x;
            this._array[1] = y;
            this._array[2] = z;
            this._dirty = true;
            return this;
        },

        clone : function(){
            return new Vector3( this.x, this.y, this.z );
        },

        copy : function(b){
            vec3.copy( this._array, b._array );
            this._dirty = true;
            return this;
        },

        cross : function(out, b){
            vec3.cross(out._array, this._array, b._array);
            return this;
        },

        dist : function(b){
            return vec3.dist(this._array, b._array);
        },

        distance : function(b){
            return vec3.distance(this._array, b._array);
        },

        div : function(b){
            vec3.div(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        divide : function(b){
            vec3.divide(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        dot : function(b){
            return vec3.dot(this._array, b._array);
        },

        len : function(){
            return vec3.len(this._array);
        },

        length : function(){
            return vec3.length(this._array);
        },
        /**
         * Perform linear interpolation between a and b
         */
        lerp : function(a, b, t){
            vec3.lerp(this._array, a._array, b._array, t);
            this._dirty = true;
            return this;
        },

        mul : function(b){
            vec3.mul(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        multiply : function(b){
            vec3.multiply(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        negate : function(){
            vec3.negate(this._array, this._array);
            this._dirty = true;
            return this;
        },

        normalize : function(){
            vec3.normalize(this._array, this._array);
            this._dirty = true;
            return this;
        },

        random : function(scale){
            vec3.random(this._array, scale);
            this._dirty = true;
            return this;
        },

        scale : function(s){
            vec3.scale(this._array, this._array, s);
            this._dirty = true;
            return this;
        },
        /**
         * add b by a scaled factor
         */
        scaleAndAdd : function(b, s){
            vec3.scaleAndAdd(this._array, this._array, b._array, s);
            this._dirty = true;
            return this;
        },

        sqrDist : function(b){
            return vec3.sqrDist(this._array, b._array);
        },

        squaredDistance : function(b){
            return vec3.squaredDistance(this._array, b._array);
        },

        sqrLen : function(){
            return vec3.sqrLen(this._array);
        },

        squaredLength : function(){
            return vec3.squaredLength(this._array);
        },

        sub : function(b){
            vec3.sub(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        subtract : function(b){
            vec3.subtract(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        transformMat3 : function(m){
            vec3.transformMat3(this._array, this._array, m._array);
            this._dirty = true;
            return this;
        },

        transformMat4 : function(m){
            vec3.transformMat4(this._array, this._array, m._array);
            this._dirty = true;
            return this;
        },

        transformQuat : function(q){
            vec3.transformQuat(this._array, this._array, q._array);
            this._dirty = true;
            return this;
        },     
        /**
         * Set euler angle from queternion
         */
        setEulerFromQuaternion : function(q){
            // var sqx = q.x * q.x;
            // var sqy = q.y * q.y;
            // var sqz = q.z * q.z;
            // var sqw = q.w * q.w;
            // this.x = Math.atan2( 2 * ( q.y * q.z + q.x * q.w ), ( -sqx - sqy + sqz + sqw ) );
            // this.y = Math.asin( -2 * ( q.x * q.z - q.y * q.w ) );
            // this.z = Math.atan2( 2 * ( q.x * q.y + q.z * q.w ), ( sqx - sqy - sqz + sqw ) );

            // return this;
        },

        toString : function(){
            return "[" + Array.prototype.join.call(this._array, ",") + "]";
        },
    }


    function clamp( x ) {
        return Math.min( Math.max( x, -1 ), 1 );
    }

    return Vector3;

} )