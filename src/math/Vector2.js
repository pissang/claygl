define(function(require) {

    'use strict';

    var glMatrix = require('../dep/glmatrix');
    var vec2 = glMatrix.vec2;

    /**
     * @constructor
     * @alias qtek.math.Vector2
     * @param {number} x
     * @param {number} y
     */
    var Vector2 = function(x, y) {
        
        x = x || 0;
        y = y || 0;

        /**
         * Storage of Vector2, read and write of x, y will change the values in _array
         * All methods also operate on the _array instead of x, y components
         * @name _array
         * @type {Float32Array}
         */
        this._array = vec2.fromValues(x, y);

        /**
         * Dirty flag is used by the Node to determine
         * if the matrix is updated to latest
         * @name _dirty
         * @type {boolean}
         */
        this._dirty = true;
    };

    Vector2.prototype = {

        constructor: Vector2,

        /**
         * Add b to self
         * @param  {qtek.math.Vector2} b
         * @return {qtek.math.Vector2}
         */
        add: function(b) {
            vec2.add(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Set x and y components
         * @param  {number}  x
         * @param  {number}  y
         * @return {qtek.math.Vector2}
         */
        set: function(x, y) {
            this._array[0] = x;
            this._array[1] = y;
            this._dirty = true;
            return this;
        },

        /**
         * Set x and y components from array
         * @param  {Float32Array|number[]} arr
         * @return {qtek.math.Vector2}
         */
        setArray: function(arr) {
            this._array[0] = arr[0];
            this._array[1] = arr[1];

            this._dirty = true;
            return this;
        },

        /**
         * Clone a new Vector2
         * @return {qtek.math.Vector2}
         */
        clone: function() {
            return new Vector2(this.x, this.y);
        },

        /**
         * Copy x, y from b
         * @param  {qtek.math.Vector2} b
         * @return {qtek.math.Vector2}
         */
        copy: function(b) {
            vec2.copy(this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Cross product of self and b, written to a Vector3 out
         * @param  {qtek.math.Vector3} out
         * @param  {qtek.math.Vector2} b
         * @return {qtek.math.Vector2}
         */
        cross: function(out, b) {
            vec2.cross(out._array, this._array, b._array);
            out._dirty = true;
            return this;
        },

        /**
         * Alias for distance
         * @param  {qtek.math.Vector2} b
         * @return {number}
         */
        dist: function(b) {
            return vec2.dist(this._array, b._array);
        },

        /**
         * Distance between self and b
         * @param  {qtek.math.Vector2} b
         * @return {number}
         */
        distance: function(b) {
            return vec2.distance(this._array, b._array);
        },

        /**
         * Alias for divide
         * @param  {qtek.math.Vector2} b
         * @return {qtek.math.Vector2}
         */
        div: function(b) {
            vec2.div(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Divide self by b
         * @param  {qtek.math.Vector2} b
         * @return {qtek.math.Vector2}
         */
        divide: function(b) {
            vec2.divide(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Dot product of self and b
         * @param  {qtek.math.Vector2} b
         * @return {number}
         */
        dot: function(b) {
            return vec2.dot(this._array, b._array);
        },

        /**
         * Alias of length
         * @return {number}
         */
        len: function() {
            return vec2.len(this._array);
        },

        /**
         * Calculate the length
         * @return {number}
         */
        length: function() {
            return vec2.length(this._array);
        },
        
        /**
         * Linear interpolation between a and b
         * @param  {qtek.math.Vector2} a
         * @param  {qtek.math.Vector2} b
         * @param  {number}  t
         * @return {qtek.math.Vector2}
         */
        lerp: function(a, b, t) {
            vec2.lerp(this._array, a._array, b._array, t);
            this._dirty = true;
            return this;
        },

        /**
         * Minimum of self and b
         * @param  {qtek.math.Vector2} b
         * @return {qtek.math.Vector2}
         */
        min: function(b) {
            vec2.min(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Maximum of self and b
         * @param  {qtek.math.Vector2} b
         * @return {qtek.math.Vector2}
         */
        max: function(b) {
            vec2.max(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Alias for multiply
         * @param  {qtek.math.Vector2} b
         * @return {qtek.math.Vector2}
         */
        mul: function(b) {
            vec2.mul(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Mutiply self and b
         * @param  {qtek.math.Vector2} b
         * @return {qtek.math.Vector2}
         */
        multiply: function(b) {
            vec2.multiply(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Negate self
         * @return {qtek.math.Vector2}
         */
        negate: function() {
            vec2.negate(this._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Normalize self
         * @return {qtek.math.Vector2}
         */
        normalize: function() {
            vec2.normalize(this._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Generate random x, y components with a given scale
         * @param  {number} scale
         * @return {qtek.math.Vector2}
         */
        random: function(scale) {
            vec2.random(this._array, scale);
            this._dirty = true;
            return this;
        },

        /**
         * Scale self
         * @param  {number}  scale
         * @return {qtek.math.Vector2}
         */
        scale: function(s) {
            vec2.scale(this._array, this._array, s);
            this._dirty = true;
            return this;
        },

        /**
         * Scale b and add to self
         * @param  {qtek.math.Vector2} b
         * @param  {number}  scale
         * @return {qtek.math.Vector2}
         */
        scaleAndAdd: function(b, s) {
            vec2.scaleAndAdd(this._array, this._array, b._array, s);
            this._dirty = true;
            return this;
        },

        /**
         * Alias for squaredDistance
         * @param  {qtek.math.Vector2} b
         * @return {number}
         */
        sqrDist: function(b) {
            return vec2.sqrDist(this._array, b._array);
        },

        /**
         * Squared distance between self and b
         * @param  {qtek.math.Vector2} b
         * @return {number}
         */
        squaredDistance: function(b) {
            return vec2.squaredDistance(this._array, b._array);
        },

        /**
         * Alias for squaredLength
         * @return {number}
         */
        sqrLen: function() {
            return vec2.sqrLen(this._array);
        },

        /**
         * Squared length of self
         * @return {number}
         */
        squaredLength: function() {
            return vec2.squaredLength(this._array);
        },

        /**
         * Alias for subtract
         * @param  {qtek.math.Vector2} b
         * @return {qtek.math.Vector2}
         */
        sub: function(b) {
            vec2.sub(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Subtract b from self
         * @param  {qtek.math.Vector2} b
         * @return {qtek.math.Vector2}
         */
        subtract: function(b) {
            vec2.subtract(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Transform self with a Matrix2 m
         * @param  {qtek.math.Matrix2} m
         * @return {qtek.math.Vector2}
         */
        transformMat2: function(m) {
            vec2.transformMat2(this._array, this._array, m._array);
            this._dirty = true;
            return this;
        },

        /**
         * Transform self with a Matrix2d m
         * @param  {qtek.math.Matrix2d} m
         * @return {qtek.math.Vector2}
         */
        transformMat2d: function(m) {
            vec2.transformMat2d(this._array, this._array, m._array);
            this._dirty = true;
            return this;
        },

        /**
         * Transform self with a Matrix3 m
         * @param  {qtek.math.Matrix3} m
         * @return {qtek.math.Vector2}
         */
        transformMat3: function(m) {
            vec2.transformMat3(this._array, this._array, m._array);
            this._dirty = true;
            return this;
        },

        /**
         * Transform self with a Matrix4 m
         * @param  {qtek.math.Matrix4} m
         * @return {qtek.math.Vector2}
         */
        transformMat4: function(m) {
            vec2.transformMat4(this._array, this._array, m._array);
            this._dirty = true;
            return this;
        },

        toString: function() {
            return '[' + Array.prototype.join.call(this._array, ',') + ']';
        },
    };

    // Getter and Setter
    if (Object.defineProperty) {

        var proto = Vector2.prototype;
        /**
         * @name x
         * @type {number}
         * @memberOf qtek.math.Vector2
         * @instance
         */
        Object.defineProperty(proto, 'x', {
            get: function () {
                return this._array[0];
            },
            set: function (value) {
                this._array[0] = value;
                this._dirty = true;
            }
        });

        /**
         * @name y
         * @type {number}
         * @memberOf qtek.math.Vector2
         * @instance
         */
        Object.defineProperty(proto, 'y', {
            get: function () {
                return this._array[1];
            },
            set: function (value) {
                this._array[1] = value;
                this._dirty = true;
            }
        });
    }

    // Supply methods that are not in place
    
    /**
     * @param  {qtek.math.Vector2} out
     * @param  {qtek.math.Vector2} a
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    Vector2.add = function(out, a, b) {
        vec2.add(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector2} out
     * @param  {number}  x
     * @param  {number}  y
     * @return {qtek.math.Vector2}  
     */
    Vector2.set = function(out, x, y) {
        vec2.set(out._array, x, y);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector2} out
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    Vector2.copy = function(out, b) {
        vec2.copy(out._array, b._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector2} a
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    Vector2.cross = function(out, a, b) {
        vec2.cross(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector2} a
     * @param  {qtek.math.Vector2} b
     * @return {number}
     */
    Vector2.dist = function(a, b) {
        return vec2.distance(a._array, b._array);
    };
    /**
     * @method
     * @param  {qtek.math.Vector2} a
     * @param  {qtek.math.Vector2} b
     * @return {number}
     */
    Vector2.distance = Vector2.dist;
    /**
     * @param  {qtek.math.Vector2} out
     * @param  {qtek.math.Vector2} a
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    Vector2.div = function(out, a, b) {
        vec2.divide(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };
    /**
     * @method
     * @param  {qtek.math.Vector2} out
     * @param  {qtek.math.Vector2} a
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    Vector2.divide = Vector2.div;
    /**
     * @param  {qtek.math.Vector2} a
     * @param  {qtek.math.Vector2} b
     * @return {number}
     */
    Vector2.dot = function(a, b) {
        return vec2.dot(a._array, b._array);
    };

    /**
     * @param  {qtek.math.Vector2} a
     * @return {number}
     */
    Vector2.len = function(b) {
        return vec2.length(b._array);
    };

    // Vector2.length = Vector2.len;
    
    /**
     * @param  {qtek.math.Vector2} out
     * @param  {qtek.math.Vector2} a
     * @param  {qtek.math.Vector2} b
     * @param  {number}  t
     * @return {qtek.math.Vector2}
     */
    Vector2.lerp = function(out, a, b, t) {
        vec2.lerp(out._array, a._array, b._array, t);
        out._dirty = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector2} out
     * @param  {qtek.math.Vector2} a
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    Vector2.min = function(out, a, b) {
        vec2.min(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector2} out
     * @param  {qtek.math.Vector2} a
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    Vector2.max = function(out, a, b) {
        vec2.max(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector2} out
     * @param  {qtek.math.Vector2} a
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    Vector2.mul = function(out, a, b) {
        vec2.multiply(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };
    /**
     * @method
     * @param  {qtek.math.Vector2} out
     * @param  {qtek.math.Vector2} a
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    Vector2.multiply = Vector2.mul;
    /**
     * @param  {qtek.math.Vector2} out
     * @param  {qtek.math.Vector2} a
     * @return {qtek.math.Vector2}
     */
    Vector2.negate = function(out, a) {
        vec2.negate(out._array, a._array);
        out._dirty = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector2} out
     * @param  {qtek.math.Vector2} a
     * @return {qtek.math.Vector2}
     */
    Vector2.normalize = function(out, a) {
        vec2.normalize(out._array, a._array);
        out._dirty = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector2} out
     * @param  {number}  scale
     * @return {qtek.math.Vector2}
     */
    Vector2.random = function(out, scale) {
        vec2.random(out._array, scale);
        out._dirty = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector2} out
     * @param  {qtek.math.Vector2} a
     * @param  {number}  scale
     * @return {qtek.math.Vector2}
     */
    Vector2.scale = function(out, a, scale) {
        vec2.scale(out._array, a._array, scale);
        out._dirty = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector2} out
     * @param  {qtek.math.Vector2} a
     * @param  {qtek.math.Vector2} b
     * @param  {number}  scale
     * @return {qtek.math.Vector2}
     */
    Vector2.scaleAndAdd = function(out, a, b, scale) {
        vec2.scaleAndAdd(out._array, a._array, b._array, scale);
        out._dirty = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector2} a
     * @param  {qtek.math.Vector2} b
     * @return {number}
     */
    Vector2.sqrDist = function(a, b) {
        return vec2.sqrDist(a._array, b._array);
    };
    /**
     * @method
     * @param  {qtek.math.Vector2} a
     * @param  {qtek.math.Vector2} b
     * @return {number}
     */
    Vector2.squaredDistance = Vector2.sqrDist;
    
    /**
     * @param  {qtek.math.Vector2} a
     * @return {number}
     */
    Vector2.sqrLen = function(a) {
        return vec2.sqrLen(a._array);
    };
    /**
     * @method
     * @param  {qtek.math.Vector2} a
     * @return {number}
     */
    Vector2.squaredLength = Vector2.sqrLen;

    /**
     * @param  {qtek.math.Vector2} out
     * @param  {qtek.math.Vector2} a
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    Vector2.sub = function(out, a, b) {
        vec2.subtract(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };
    /**
     * @method
     * @param  {qtek.math.Vector2} out
     * @param  {qtek.math.Vector2} a
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    Vector2.subtract = Vector2.sub;
    /**
     * @param  {qtek.math.Vector2} out
     * @param  {qtek.math.Vector2} a
     * @param  {qtek.math.Matrix2} m
     * @return {qtek.math.Vector2}
     */
    Vector2.transformMat2 = function(out, a, m) {
        vec2.transformMat2(out._array, a._array, m._array);
        out._dirty = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector2}  out
     * @param  {qtek.math.Vector2}  a
     * @param  {qtek.math.Matrix2d} m
     * @return {qtek.math.Vector2}
     */
    Vector2.transformMat2d = function(out, a, m) {
        vec2.transformMat2d(out._array, a._array, m._array);
        out._dirty = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector2} out
     * @param  {qtek.math.Vector2} a
     * @param  {Matrix3} m
     * @return {qtek.math.Vector2}
     */
    Vector2.transformMat3 = function(out, a, m) {
        vec2.transformMat3(out._array, a._array, m._array);
        out._dirty = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector2} out
     * @param  {qtek.math.Vector2} a
     * @param  {qtek.math.Matrix4} m
     * @return {qtek.math.Vector2}
     */
    Vector2.transformMat4 = function(out, a, m) {
        vec2.transformMat4(out._array, a._array, m._array);
        out._dirty = true;
        return out;
    };

    return Vector2;

});