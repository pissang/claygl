define( function(require) {

    'use strict';

    var glMatrix = require("glmatrix");
    var vec4 = glMatrix.vec4;

    var Vector4 = function(x, y, z, w) {
        
        x = x || 0;
        y = y || 0;
        z = z || 0;
        w = w || 0;

        this._array = vec4.fromValues(x, y, z, w);
        // Dirty flag is used by the Node to determine
        // if the matrix is updated to latest
        this._dirty = true;
    }

    Vector4.prototype = {

        constructor : Vector4,

        get x() {
            return this._array[0];
        },

        set x(value) {
            this._array[0] = value;
            this._dirty = true;
        },

        get y() {
            this._array[1] = value;
            this._dirty = true;
        },

        set y(value) {
            return this._array[1];
        },

        get z() {
            return this._array[2];
        },

        set z(value) {
            this._array[2] = value;
            this._dirty = true;
        },

        get w() {
            return this._array[3];
        },

        set w(value) {
            this._array[3] = value;
            this._dirty = true;
        },

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

        setArray : function(arr) {
            this._array[0] = arr[0];
            this._array[1] = arr[1];
            this._array[2] = arr[2];
            this._array[3] = arr[3];

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

    // Supply methods that are not in place
    Vector4.add = function(out, a, b) {
        vec4.add(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    }

    Vector4.set = function(out, x, y, z, w) {
        vec4.set(out._array, x, y, z, w);
        out._dirty = true;
    }

    Vector4.copy = function(out, b) {
        vec4.copy(out._array, b._array);
        out._dirty = true;
        return out;
    }

    Vector4.dist = function(a, b) {
        return vec4.distance(a._array, b._array);
    }

    Vector4.distance = Vector4.dist;

    Vector4.div = function(out, a, b) {
        vec4.divide(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    }

    Vector4.divide = Vector4.div;

    Vector4.dot = function(a, b) {
        return vec4.dot(a._array, b._array);
    }

    Vector4.len = function(b) {
        return vec4.length(b._array);
    }

    Vector4.length = Vector4.len;

    Vector4.lerp = function(out, a, b, t) {
        vec4.lerp(out._array, a._array, b._array, t);
        out._dirty = true;
        return out;
    }

    Vector4.min = function(out, a, b) {
        vec4.min(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    }

    Vector4.max = function(out, a, b) {
        vec4.max(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    }

    Vector4.mul = function(out, a, b) {
        vec4.multiply(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    }

    Vector4.multiply = Vector4.mul;

    Vector4.negate = function(out, a) {
        vec4.negate(out._array, a._array);
        out._dirty = true;
        return out;
    }

    Vector4.normalize = function(out, a) {
        vec4.normalize(out._array, a._array);
        out._dirty = true;
        return out;
    }

    Vector4.random = function(out, scale) {
        vec4.random(out._array, scale);
        out._dirty = true;
        return out;
    }

    Vector4.scale = function(out, a, scale) {
        vec4.scale(out._array, a._array, scale);
        out._dirty = true;
        return out;
    }

    Vector4.scaleAndAdd = function(out, a, b, scale) {
        vec4.scale(out._array, a._array, b._array, scale);
        out._dirty = true;
        return out;
    }

    Vector4.sqrDist = function(a, b) {
        return vec4.sqrDist(a._array, b._array);
    }

    Vector4.squaredDistance = Vector4.sqrDist;

    Vector4.sqrLen = function(a) {
        return vec4.sqrLen(a._array);
    }
    Vector4.squaredLength = Vector4.sqrLen;

    Vector4.sub = function(out, a, b) {
        vec4.subtract(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    }
    Vector4.subtract = Vector4.sub;

    Vector4.transformMat4 = function(out, a, m) {
        vec4.transformMat4(out._array, a._array, m._array);
        out._dirty = true;
        return out;
    }

    Vector4.transformQuat = function(out, a, q) {
        vec4.transformQuat(out._array, a._array, m._array);
        out._dirty = true;
        return out;
    }

    return Vector4;
} )