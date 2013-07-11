define( function(require) {

    var glMatrix = require("glmatrix");
    var vec4 = glMatrix.vec4;

    var Vector4 = function(x, y, z, w) {
        
        x = x || 0;
        y = y || 0;
        z = z || 0;
        w = w || 0;

        return Object.create(Vector4Proto, {

            x : {
                configurable : false,
                set : function(value) {
                    this._array[0] = value;
                    this._dirty = true;
                },
                get : function() {
                    return this._array[0];
                }
            },
            y : {
                configurable : false,
                set : function(value) {
                    this._array[1] = value;
                    this._dirty = true;
                },
                get : function() {
                    return this._array[1];
                }
            },
            z : {
                configurable : false,
                set : function(value) {
                    this._array[2] = value;
                    this._dirty = true;
                },
                get : function() {
                    return this._array[2];
                }
            },
            w : {
                configurable : false,
                set : function(value) {
                    this._array[2] = value;
                    this._dirty = true;
                },
                get : function() {
                    return this._array[2];
                }
            },

            _array :{
                writable : false,
                configurable : false,
                value : vec4.fromValues(x, y, z, w)
            },
            _dirty : {
                configurable : false,
                value : false
            }
        })

    }

    var Vector4Proto = {

        constructor : Vector4,

        add : function(b) {
            vec4.add( this._array, this._array, b._array );
            this._dirty = true;
            return this;
        },

        set : function(x, y, z, w) {
            this._array[0] = x;
            this._array[1] = y;
            this._array[2] = z;
            this._array[3] = w;
            this._dirty = true;
            return this;
        },

        clone : function() {
            return new Vector4( this.x, this.y, this.z, this.w);
        },

        copy : function(b) {
            vec4.copy( this._array, b._array );
            this._dirty = true;
            return this;
        },

        cross : function(out, b) {
            vec4.cross(out._array, this._array, b._array);
            return this;
        },

        dist : function(b) {
            return vec4.dist(this._array, b._array);
        },

        distance : function(b) {
            return vec4.distance(this._array, b._array);
        },

        div : function(b) {
            vec4.div(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        divide : function(b) {
            vec4.divide(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        dot : function(b) {
            return vec4.dot(this._array, b._array);
        },

        len : function() {
            return vec4.len(this._array);
        },

        length : function() {
            return vec4.length(this._array);
        },
        /**
         * Perform linear interpolation between a and b
         */
        lerp : function(a, b, t) {
            vec4.lerp(this._array, a._array, b._array, t);
            this._dirty = true;
            return this;
        },

        min : function(b) {
            vec2.min(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        max : function(b) {
            vec2.max(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        mul : function(b) {
            vec4.mul(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        multiply : function(b) {
            vec4.multiply(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        negate : function() {
            vec4.negate(this._array, this._array);
            this._dirty = true;
            return this;
        },

        normalize : function() {
            vec4.normalize(this._array, this._array);
            this._dirty = true;
            return this;
        },

        random : function(scale) {
            vec4.random(this._array, scale);
            this._dirty = true;
            return this;
        },

        scale : function(s) {
            vec4.scale(this._array, this._array, s);
            this._dirty = true;
            return this;
        },
        /**
         * add b by a scaled factor
         */
        scaleAndAdd : function(b, s) {
            vec4.scaleAndAdd(this._array, this._array, b._array, s);
            this._dirty = true;
            return this;
        },

        sqrDist : function(b) {
            return vec4.sqrDist(this._array, b._array);
        },

        squaredDistance : function(b) {
            return vec4.squaredDistance(this._array, b._array);
        },

        sqrLen : function() {
            return vec4.sqrLen(this._array);
        },

        squaredLength : function() {
            return vec4.squaredLength(this._array);
        },

        sub : function(b) {
            vec4.sub(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        subtract : function(b) {
            vec4.subtract(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        transformMat4 : function(m) {
            vec4.transformMat4(this._array, this._array, m._array);
            this._dirty = true;
            return this;
        },

        transformQuat : function(q) {
            vec4.transformQuat(this._array, this._array, q._array);
            this._dirty = true;
            return this;
        },     

        toString : function() {
            return "[" + Array.prototype.join.call(this._array, ",") + "]";
        }
    }

    return Vector4;
} )