define(function(require) {

    'use strict';

    var glMatrix = require('../dep/glmatrix');
    var vec4 = glMatrix.vec4;

    /**
     * @constructor
     * @alias qtek.math.Vector4
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} w
     */
    var Vector4 = function(x, y, z, w) {
        
        x = x || 0;
        y = y || 0;
        z = z || 0;
        w = w || 0;

        /**
         * Storage of Vector4, read and write of x, y, z, w will change the values in _array
         * All methods also operate on the _array instead of x, y, z, w components
         * @name _array
         * @type {Float32Array}
         */
        this._array = vec4.fromValues(x, y, z, w);

        /**
         * Dirty flag is used by the Node to determine
         * if the matrix is updated to latest
         * @name _dirty
         * @type {boolean}
         */
        this._dirty = true;
    };

    Vector4.prototype = {

        constructor: Vector4,

        /**
         * Add b to self
         * @param  {qtek.math.Vector4} b
         * @return {qtek.math.Vector4}
         */
        add: function(b) {
            vec4.add(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Set x, y and z components
         * @param  {number}  x
         * @param  {number}  y
         * @param  {number}  z
         * @param  {number}  w
         * @return {qtek.math.Vector4}
         */
        set: function(x, y, z, w) {
            this._array[0] = x;
            this._array[1] = y;
            this._array[2] = z;
            this._array[3] = w;
            this._dirty = true;
            return this;
        },

        /**
         * Set x, y, z and w components from array
         * @param  {Float32Array|number[]} arr
         * @return {qtek.math.Vector4}
         */
        setArray: function(arr) {
            this._array[0] = arr[0];
            this._array[1] = arr[1];
            this._array[2] = arr[2];
            this._array[3] = arr[3];

            this._dirty = true;
            return this;
        },

        /**
         * Clone a new Vector4
         * @return {qtek.math.Vector4}
         */
        clone: function() {
            return new Vector4(this.x, this.y, this.z, this.w);
        },

        /**
         * Copy from b
         * @param  {qtek.math.Vector4} b
         * @return {qtek.math.Vector4}
         */
        copy: function(b) {
            vec4.copy(this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Alias for distance
         * @param  {qtek.math.Vector4} b
         * @return {number}
         */
        dist: function(b) {
            return vec4.dist(this._array, b._array);
        },

        /**
         * Distance between self and b
         * @param  {qtek.math.Vector4} b
         * @return {number}
         */
        distance: function(b) {
            return vec4.distance(this._array, b._array);
        },

        /**
         * Alias for divide
         * @param  {qtek.math.Vector4} b
         * @return {qtek.math.Vector4}
         */
        div: function(b) {
            vec4.div(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Divide self by b
         * @param  {qtek.math.Vector4} b
         * @return {qtek.math.Vector4}
         */
        divide: function(b) {
            vec4.divide(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Dot product of self and b
         * @param  {qtek.math.Vector4} b
         * @return {number}
         */
        dot: function(b) {
            return vec4.dot(this._array, b._array);
        },

        /**
         * Alias of length
         * @return {number}
         */
        len: function() {
            return vec4.len(this._array);
        },

        /**
         * Calculate the length
         * @return {number}
         */
        length: function() {
            return vec4.length(this._array);
        },
        /**
         * Linear interpolation between a and b
         * @param  {qtek.math.Vector4} a
         * @param  {qtek.math.Vector4} b
         * @param  {number}  t
         * @return {qtek.math.Vector4}
         */
        lerp: function(a, b, t) {
            vec4.lerp(this._array, a._array, b._array, t);
            this._dirty = true;
            return this;
        },

        /**
         * Minimum of self and b
         * @param  {qtek.math.Vector4} b
         * @return {qtek.math.Vector4}
         */
        min: function(b) {
            vec4.min(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Maximum of self and b
         * @param  {qtek.math.Vector4} b
         * @return {qtek.math.Vector4}
         */
        max: function(b) {
            vec4.max(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Alias for multiply
         * @param  {qtek.math.Vector4} b
         * @return {qtek.math.Vector4}
         */
        mul: function(b) {
            vec4.mul(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Mutiply self and b
         * @param  {qtek.math.Vector4} b
         * @return {qtek.math.Vector4}
         */
        multiply: function(b) {
            vec4.multiply(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Negate self
         * @return {qtek.math.Vector4}
         */
        negate: function() {
            vec4.negate(this._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Normalize self
         * @return {qtek.math.Vector4}
         */
        normalize: function() {
            vec4.normalize(this._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Generate random x, y, z, w components with a given scale
         * @param  {number} scale
         * @return {qtek.math.Vector4}
         */
        random: function(scale) {
            vec4.random(this._array, scale);
            this._dirty = true;
            return this;
        },

        /**
         * Scale self
         * @param  {number}  scale
         * @return {qtek.math.Vector4}
         */
        scale: function(s) {
            vec4.scale(this._array, this._array, s);
            this._dirty = true;
            return this;
        },
        /**
         * Scale b and add to self
         * @param  {qtek.math.Vector4} b
         * @param  {number}  scale
         * @return {qtek.math.Vector4}
         */
        scaleAndAdd: function(b, s) {
            vec4.scaleAndAdd(this._array, this._array, b._array, s);
            this._dirty = true;
            return this;
        },

        /**
         * Alias for squaredDistance
         * @param  {qtek.math.Vector4} b
         * @return {number}
         */
        sqrDist: function(b) {
            return vec4.sqrDist(this._array, b._array);
        },

        /**
         * Squared distance between self and b
         * @param  {qtek.math.Vector4} b
         * @return {number}
         */
        squaredDistance: function(b) {
            return vec4.squaredDistance(this._array, b._array);
        },

        /**
         * Alias for squaredLength
         * @return {number}
         */
        sqrLen: function() {
            return vec4.sqrLen(this._array);
        },

        /**
         * Squared length of self
         * @return {number}
         */
        squaredLength: function() {
            return vec4.squaredLength(this._array);
        },

        /**
         * Alias for subtract
         * @param  {qtek.math.Vector4} b
         * @return {qtek.math.Vector4}
         */
        sub: function(b) {
            vec4.sub(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Subtract b from self
         * @param  {qtek.math.Vector4} b
         * @return {qtek.math.Vector4}
         */
        subtract: function(b) {
            vec4.subtract(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Transform self with a Matrix4 m
         * @param  {qtek.math.Matrix4} m
         * @return {qtek.math.Vector4}
         */
        transformMat4: function(m) {
            vec4.transformMat4(this._array, this._array, m._array);
            this._dirty = true;
            return this;
        },

        /**
         * Transform self with a Quaternion q
         * @param  {qtek.math.Quaternion} q
         * @return {qtek.math.Vector4}
         */
        transformQuat: function(q) {
            vec4.transformQuat(this._array, this._array, q._array);
            this._dirty = true;
            return this;
        },     

        toString: function() {
            return '[' + Array.prototype.join.call(this._array, ',') + ']';
        }
    };

    var defineProperty = Object.defineProperty;
    // Getter and Setter
    if (defineProperty) {

        var proto = Vector4.prototype;
        /**
         * @name x
         * @type {number}
         * @memberOf qtek.math.Vector4
         * @instance
         */
        defineProperty(proto, 'x', {
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
         * @memberOf qtek.math.Vector4
         * @instance
         */
        defineProperty(proto, 'y', {
            get: function () {
                return this._array[1];
            },
            set: function (value) {
                this._array[1] = value;
                this._dirty = true;
            }
        });

        /**
         * @name z
         * @type {number}
         * @memberOf qtek.math.Vector4
         * @instance
         */
        defineProperty(proto, 'z', {
            get: function () {
                return this._array[2];
            },
            set: function (value) {
                this._array[2] = value;
                this._dirty = true;
            }
        });

        /**
         * @name w
         * @type {number}
         * @memberOf qtek.math.Vector4
         * @instance
         */
        defineProperty(proto, 'w', {
            get: function () {
                return this._array[3];
            },
            set: function (value) {
                this._array[3] = value;
                this._dirty = true;
            }
        });
    }

    // Supply methods that are not in place
    
    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @return {qtek.math.Vector4}
     */
    Vector4.add = function(out, a, b) {
        vec4.add(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {number}  x
     * @param  {number}  y
     * @param  {number}  z
     * @return {qtek.math.Vector4}  
     */
    Vector4.set = function(out, x, y, z, w) {
        vec4.set(out._array, x, y, z, w);
        out._dirty = true;
    };

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} b
     * @return {qtek.math.Vector4}
     */
    Vector4.copy = function(out, b) {
        vec4.copy(out._array, b._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @return {number}
     */
    Vector4.dist = function(a, b) {
        return vec4.distance(a._array, b._array);
    };

    /**
     * @method
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @return {number}
     */
    Vector4.distance = Vector4.dist;

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @return {qtek.math.Vector4}
     */
    Vector4.div = function(out, a, b) {
        vec4.divide(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };

    /**
     * @method
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @return {qtek.math.Vector4}
     */
    Vector4.divide = Vector4.div;

    /**
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @return {number}
     */
    Vector4.dot = function(a, b) {
        return vec4.dot(a._array, b._array);
    };

    /**
     * @param  {qtek.math.Vector4} a
     * @return {number}
     */
    Vector4.len = function(b) {
        return vec4.length(b._array);
    };

    // Vector4.length = Vector4.len;

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @param  {number}  t
     * @return {qtek.math.Vector4}
     */
    Vector4.lerp = function(out, a, b, t) {
        vec4.lerp(out._array, a._array, b._array, t);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @return {qtek.math.Vector4}
     */
    Vector4.min = function(out, a, b) {
        vec4.min(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @return {qtek.math.Vector4}
     */
    Vector4.max = function(out, a, b) {
        vec4.max(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @return {qtek.math.Vector4}
     */
    Vector4.mul = function(out, a, b) {
        vec4.multiply(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };

    /**
     * @method
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @return {qtek.math.Vector4}
     */
    Vector4.multiply = Vector4.mul;

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @return {qtek.math.Vector4}
     */
    Vector4.negate = function(out, a) {
        vec4.negate(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @return {qtek.math.Vector4}
     */
    Vector4.normalize = function(out, a) {
        vec4.normalize(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {number}  scale
     * @return {qtek.math.Vector4}
     */
    Vector4.random = function(out, scale) {
        vec4.random(out._array, scale);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @param  {number}  scale
     * @return {qtek.math.Vector4}
     */
    Vector4.scale = function(out, a, scale) {
        vec4.scale(out._array, a._array, scale);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @param  {number}  scale
     * @return {qtek.math.Vector4}
     */
    Vector4.scaleAndAdd = function(out, a, b, scale) {
        vec4.scaleAndAdd(out._array, a._array, b._array, scale);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @return {number}
     */
    Vector4.sqrDist = function(a, b) {
        return vec4.sqrDist(a._array, b._array);
    };

    /**
     * @method
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @return {number}
     */
    Vector4.squaredDistance = Vector4.sqrDist;

    /**
     * @param  {qtek.math.Vector4} a
     * @return {number}
     */
    Vector4.sqrLen = function(a) {
        return vec4.sqrLen(a._array);
    };
    /**
     * @method
     * @param  {qtek.math.Vector4} a
     * @return {number}
     */
    Vector4.squaredLength = Vector4.sqrLen;

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @return {qtek.math.Vector4}
     */
    Vector4.sub = function(out, a, b) {
        vec4.subtract(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };
    /**
     * @method
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @return {qtek.math.Vector4}
     */
    Vector4.subtract = Vector4.sub;

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Matrix4} m
     * @return {qtek.math.Vector4}
     */
    Vector4.transformMat4 = function(out, a, m) {
        vec4.transformMat4(out._array, a._array, m._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Quaternion} q
     * @return {qtek.math.Vector4}
     */
    Vector4.transformQuat = function(out, a, q) {
        vec4.transformQuat(out._array, a._array, q._array);
        out._dirty = true;
        return out;
    };

    return Vector4;
});