define(function(require) {

    'use strict';

    var glMatrix = require('../dep/glmatrix');
    var vec4 = glMatrix.vec4;

    var KEY_ARRAY = '_array';
    var KEY_DIRTY = '_dirty';

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
        this[KEY_ARRAY] = vec4.fromValues(x, y, z, w);

        /**
         * Dirty flag is used by the Node to determine
         * if the matrix is updated to latest
         * @name _dirty
         * @type {boolean}
         */
        this[KEY_DIRTY] = true;
    };

    Vector4.prototype = {

        constructor: Vector4,

        /**
         * Add b to self
         * @param  {qtek.math.Vector4} b
         * @return {qtek.math.Vector4}
         */
        add: function(b) {
            vec4.add(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
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
            this[KEY_ARRAY][0] = x;
            this[KEY_ARRAY][1] = y;
            this[KEY_ARRAY][2] = z;
            this[KEY_ARRAY][3] = w;
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Set x, y, z and w components from array
         * @param  {Float32Array|number[]} arr
         * @return {qtek.math.Vector4}
         */
        setArray: function(arr) {
            this[KEY_ARRAY][0] = arr[0];
            this[KEY_ARRAY][1] = arr[1];
            this[KEY_ARRAY][2] = arr[2];
            this[KEY_ARRAY][3] = arr[3];

            this[KEY_DIRTY] = true;
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
            vec4.copy(this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Alias for distance
         * @param  {qtek.math.Vector4} b
         * @return {number}
         */
        dist: function(b) {
            return vec4.dist(this[KEY_ARRAY], b[KEY_ARRAY]);
        },

        /**
         * Distance between self and b
         * @param  {qtek.math.Vector4} b
         * @return {number}
         */
        distance: function(b) {
            return vec4.distance(this[KEY_ARRAY], b[KEY_ARRAY]);
        },

        /**
         * Alias for divide
         * @param  {qtek.math.Vector4} b
         * @return {qtek.math.Vector4}
         */
        div: function(b) {
            vec4.div(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Divide self by b
         * @param  {qtek.math.Vector4} b
         * @return {qtek.math.Vector4}
         */
        divide: function(b) {
            vec4.divide(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Dot product of self and b
         * @param  {qtek.math.Vector4} b
         * @return {number}
         */
        dot: function(b) {
            return vec4.dot(this[KEY_ARRAY], b[KEY_ARRAY]);
        },

        /**
         * Alias of length
         * @return {number}
         */
        len: function() {
            return vec4.len(this[KEY_ARRAY]);
        },

        /**
         * Calculate the length
         * @return {number}
         */
        length: function() {
            return vec4.length(this[KEY_ARRAY]);
        },
        /**
         * Linear interpolation between a and b
         * @param  {qtek.math.Vector4} a
         * @param  {qtek.math.Vector4} b
         * @param  {number}  t
         * @return {qtek.math.Vector4}
         */
        lerp: function(a, b, t) {
            vec4.lerp(this[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY], t);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Minimum of self and b
         * @param  {qtek.math.Vector4} b
         * @return {qtek.math.Vector4}
         */
        min: function(b) {
            vec4.min(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Maximum of self and b
         * @param  {qtek.math.Vector4} b
         * @return {qtek.math.Vector4}
         */
        max: function(b) {
            vec4.max(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Alias for multiply
         * @param  {qtek.math.Vector4} b
         * @return {qtek.math.Vector4}
         */
        mul: function(b) {
            vec4.mul(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Mutiply self and b
         * @param  {qtek.math.Vector4} b
         * @return {qtek.math.Vector4}
         */
        multiply: function(b) {
            vec4.multiply(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Negate self
         * @return {qtek.math.Vector4}
         */
        negate: function() {
            vec4.negate(this[KEY_ARRAY], this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Normalize self
         * @return {qtek.math.Vector4}
         */
        normalize: function() {
            vec4.normalize(this[KEY_ARRAY], this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Generate random x, y, z, w components with a given scale
         * @param  {number} scale
         * @return {qtek.math.Vector4}
         */
        random: function(scale) {
            vec4.random(this[KEY_ARRAY], scale);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Scale self
         * @param  {number}  scale
         * @return {qtek.math.Vector4}
         */
        scale: function(s) {
            vec4.scale(this[KEY_ARRAY], this[KEY_ARRAY], s);
            this[KEY_DIRTY] = true;
            return this;
        },
        /**
         * Scale b and add to self
         * @param  {qtek.math.Vector4} b
         * @param  {number}  scale
         * @return {qtek.math.Vector4}
         */
        scaleAndAdd: function(b, s) {
            vec4.scaleAndAdd(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY], s);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Alias for squaredDistance
         * @param  {qtek.math.Vector4} b
         * @return {number}
         */
        sqrDist: function(b) {
            return vec4.sqrDist(this[KEY_ARRAY], b[KEY_ARRAY]);
        },

        /**
         * Squared distance between self and b
         * @param  {qtek.math.Vector4} b
         * @return {number}
         */
        squaredDistance: function(b) {
            return vec4.squaredDistance(this[KEY_ARRAY], b[KEY_ARRAY]);
        },

        /**
         * Alias for squaredLength
         * @return {number}
         */
        sqrLen: function() {
            return vec4.sqrLen(this[KEY_ARRAY]);
        },

        /**
         * Squared length of self
         * @return {number}
         */
        squaredLength: function() {
            return vec4.squaredLength(this[KEY_ARRAY]);
        },

        /**
         * Alias for subtract
         * @param  {qtek.math.Vector4} b
         * @return {qtek.math.Vector4}
         */
        sub: function(b) {
            vec4.sub(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Subtract b from self
         * @param  {qtek.math.Vector4} b
         * @return {qtek.math.Vector4}
         */
        subtract: function(b) {
            vec4.subtract(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Transform self with a Matrix4 m
         * @param  {qtek.math.Matrix4} m
         * @return {qtek.math.Vector4}
         */
        transformMat4: function(m) {
            vec4.transformMat4(this[KEY_ARRAY], this[KEY_ARRAY], m[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Transform self with a Quaternion q
         * @param  {qtek.math.Quaternion} q
         * @return {qtek.math.Vector4}
         */
        transformQuat: function(q) {
            vec4.transformQuat(this[KEY_ARRAY], this[KEY_ARRAY], q[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },     

        toString: function() {
            return '[' + Array.prototype.join.call(this[KEY_ARRAY], ',') + ']';
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
                return this[KEY_ARRAY][0];
            },
            set: function (value) {
                this[KEY_ARRAY][0] = value;
                this[KEY_DIRTY] = true;
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
                return this[KEY_ARRAY][1];
            },
            set: function (value) {
                this[KEY_ARRAY][1] = value;
                this[KEY_DIRTY] = true;
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
                return this[KEY_ARRAY][2];
            },
            set: function (value) {
                this[KEY_ARRAY][2] = value;
                this[KEY_DIRTY] = true;
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
                return this[KEY_ARRAY][3];
            },
            set: function (value) {
                this[KEY_ARRAY][3] = value;
                this[KEY_DIRTY] = true;
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
        vec4.add(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
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
        vec4.set(out[KEY_ARRAY], x, y, z, w);
        out[KEY_DIRTY] = true;
    };

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} b
     * @return {qtek.math.Vector4}
     */
    Vector4.copy = function(out, b) {
        vec4.copy(out[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @return {number}
     */
    Vector4.dist = function(a, b) {
        return vec4.distance(a[KEY_ARRAY], b[KEY_ARRAY]);
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
        vec4.divide(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
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
        return vec4.dot(a[KEY_ARRAY], b[KEY_ARRAY]);
    };

    /**
     * @param  {qtek.math.Vector4} a
     * @return {number}
     */
    Vector4.len = function(b) {
        return vec4.length(b[KEY_ARRAY]);
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
        vec4.lerp(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY], t);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @return {qtek.math.Vector4}
     */
    Vector4.min = function(out, a, b) {
        vec4.min(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @return {qtek.math.Vector4}
     */
    Vector4.max = function(out, a, b) {
        vec4.max(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @return {qtek.math.Vector4}
     */
    Vector4.mul = function(out, a, b) {
        vec4.multiply(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
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
        vec4.negate(out[KEY_ARRAY], a[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @return {qtek.math.Vector4}
     */
    Vector4.normalize = function(out, a) {
        vec4.normalize(out[KEY_ARRAY], a[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {number}  scale
     * @return {qtek.math.Vector4}
     */
    Vector4.random = function(out, scale) {
        vec4.random(out[KEY_ARRAY], scale);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @param  {number}  scale
     * @return {qtek.math.Vector4}
     */
    Vector4.scale = function(out, a, scale) {
        vec4.scale(out[KEY_ARRAY], a[KEY_ARRAY], scale);
        out[KEY_DIRTY] = true;
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
        vec4.scaleAndAdd(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY], scale);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Vector4} b
     * @return {number}
     */
    Vector4.sqrDist = function(a, b) {
        return vec4.sqrDist(a[KEY_ARRAY], b[KEY_ARRAY]);
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
        return vec4.sqrLen(a[KEY_ARRAY]);
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
        vec4.subtract(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
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
        vec4.transformMat4(out[KEY_ARRAY], a[KEY_ARRAY], m[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector4} out
     * @param  {qtek.math.Vector4} a
     * @param  {qtek.math.Quaternion} q
     * @return {qtek.math.Vector4}
     */
    Vector4.transformQuat = function(out, a, q) {
        vec4.transformQuat(out[KEY_ARRAY], a[KEY_ARRAY], q[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    return Vector4;
});