define(function(require) {

    'use strict';

    var glMatrix = require("glmatrix");
    var vec2 = glMatrix.vec2;

    var Vector2 = function(x, y) {
        
        x = x || 0;
        y = y || 0;

        this._array = vec2.fromValues(x, y);
        // Dirty flag is used by the Node to determine
        // if the matrix is updated to latest
        this._dirty = true;
    }

    Vector2.prototype = {

        constructor : Vector2,

        get x() {
            return this._array[0];
        },

        set x(value) {
            this._array[0] = value;
            this._dirty = true;
        },

        get y() {
            return this._array[1];
        },

        set y(value) {
            this._array[1] = value;
            this._dirty = true;
        },

        add : function(b) {
            vec2.add(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        set : function(x, y) {
            this._array[0] = x;
            this._array[1] = y;
            this._dirty = true;
            return this;
        },

        setArray : function(arr) {
            this._array[0] = arr[0];
            this._array[1] = arr[1];

            this._dirty = true;
            return this;
        },

        clone : function() {
            return new Vector2(this.x, this.y);
        },

        copy : function(b) {
            vec2.copy(this._array, b._array);
            this._dirty = true;
            return this;
        },

        cross : function(out, b) {
            vec2.cross(out._array, this._array, b._array);
            return this;
        },

        dist : function(b) {
            return vec2.dist(this._array, b._array);
        },

        distance : function(b) {
            return vec2.distance(this._array, b._array);
        },

        div : function(b) {
            vec2.div(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        divide : function(b) {
            vec2.divide(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        dot : function(b) {
            return vec2.dot(this._array, b._array);
        },

        len : function() {
            return vec2.len(this._array);
        },

        length : function() {
            return vec2.length(this._array);
        },
        /**
         * Perform linear interpolation between a and b
         */
        lerp : function(a, b, t) {
            vec2.lerp(this._array, a._array, b._array, t);
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
            vec2.mul(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        multiply : function(b) {
            vec2.multiply(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        negate : function() {
            vec2.negate(this._array, this._array);
            this._dirty = true;
            return this;
        },

        normalize : function() {
            vec2.normalize(this._array, this._array);
            this._dirty = true;
            return this;
        },

        random : function(scale) {
            vec2.random(this._array, scale);
            this._dirty = true;
            return this;
        },

        scale : function(s) {
            vec2.scale(this._array, this._array, s);
            this._dirty = true;
            return this;
        },
        /**
         * add b by a scaled factor
         */
        scaleAndAdd : function(b, s) {
            vec2.scaleAndAdd(this._array, this._array, b._array, s);
            this._dirty = true;
            return this;
        },

        sqrDist : function(b) {
            return vec2.sqrDist(this._array, b._array);
        },

        squaredDistance : function(b) {
            return vec2.squaredDistance(this._array, b._array);
        },

        sqrLen : function() {
            return vec2.sqrLen(this._array);
        },

        squaredLength : function() {
            return vec2.squaredLength(this._array);
        },

        sub : function(b) {
            vec2.sub(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        subtract : function(b) {
            vec2.subtract(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        transformMat2 : function(m) {
            vec2.transformMat2(this._array, this._array, m._array);
            this._dirty = true;
            return this;
        },
        transformMat2d : function(m) {
            vec2.transformMat2d(this._array, this._array, m._array);
            this._dirty = true;
            return this;
        },
        transformMat3 : function(m) {
            vec2.transformMat3(this._array, this._array, m._array);
            this._dirty = true;
            return this;
        },
        transformMat4 : function(m) {
            vec2.transformMat4(this._array, this._array, m._array);
            this._dirty = true;
            return this;
        },

        toString : function() {
            return "[" + Array.prototype.join.call(this._array, ",") + "]";
        },
    }

    // Supply methods that are not in place
    Vector2.add = function(out, a, b) {
        vec2.add(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    }

    Vector2.set = function(out, x, y) {
        vec2.set(out._array, x, y);
        out._dirty = true;
    }

    Vector2.copy = function(out, b) {
        vec2.copy(out._array, b._array);
        out._dirty = true;
        return out;
    }

    Vector2.cross = function(out, a, b) {
        vec2.cross(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    }

    Vector2.dist = function(a, b) {
        return vec2.distance(a._array, b._array);
    }

    Vector2.distance = Vector2.dist;

    Vector2.div = function(out, a, b) {
        vec2.divide(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    }

    Vector2.divide = Vector2.div;

    Vector2.dot = function(a, b) {
        return vec2.dot(a._array, b._array);
    }

    Vector2.len = function(b) {
        return vec2.length(b._array);
    }

    // Vector2.length = Vector2.len;

    Vector2.lerp = function(out, a, b, t) {
        vec2.lerp(out._array, a._array, b._array, t);
        out._dirty = true;
        return out;
    }

    Vector2.min = function(out, a, b) {
        vec2.min(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    }

    Vector2.max = function(out, a, b) {
        vec2.max(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    }

    Vector2.mul = function(out, a, b) {
        vec2.multiply(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    }

    Vector2.multiply = Vector2.mul;

    Vector2.negate = function(out, a) {
        vec2.negate(out._array, a._array);
        out._dirty = true;
        return out;
    }

    Vector2.normalize = function(out, a) {
        vec2.normalize(out._array, a._array);
        out._dirty = true;
        return out;
    }

    Vector2.random = function(out, scale) {
        vec2.random(out._array, scale);
        out._dirty = true;
        return out;
    }

    Vector2.scale = function(out, a, scale) {
        vec2.scale(out._array, a._array, scale);
        out._dirty = true;
        return out;
    }

    Vector2.scaleAndAdd = function(out, a, b, scale) {
        vec2.scale(out._array, a._array, b._array, scale);
        out._dirty = true;
        return out;
    }

    Vector2.sqrDist = function(a, b) {
        return vec2.sqrDist(a._array, b._array);
    }

    Vector2.squaredDistance = Vector2.sqrDist;

    Vector2.sqrLen = function(a) {
        return vec2.sqrLen(a._array);
    }
    Vector2.squaredLength = Vector2.sqrLen;

    Vector2.sub = function(out, a, b) {
        vec2.subtract(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    }
    Vector2.subtract = Vector2.sub;

    Vector2.transformMat2 = function(out, a, m) {
        vec2.transformMat2(out._array, a._array, m._array);
        out._dirty = true;
        return out;
    }

    Vector2.transformMat2d = function(out, a, m) {
        vec2.transformMat2d(out._array, a._array, m._array);
        out._dirty = true;
        return out;
    }

    Vector2.transformMat3 = function(out, a, m) {
        vec2.transformMat3(out._array, a._array, m._array);
        out._dirty = true;
        return out;
    }

    Vector2.transformMat4 = function(out, a, m) {
        vec2.transformMat4(out._array, a._array, m._array);
        out._dirty = true;
        return out;
    }

    return Vector2;

})