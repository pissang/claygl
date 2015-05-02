define(function(require) {
    
    'use strict';

    var glMatrix = require('../dep/glmatrix');
    var vec3 = glMatrix.vec3;

    /**
     * @constructor
     * @alias qtek.math.Vector3
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    var Vector3 = function(x, y, z) {
        
        x = x || 0;
        y = y || 0;
        z = z || 0;

        /**
         * Storage of Vector3, read and write of x, y, z will change the values in _array
         * All methods also operate on the _array instead of x, y, z components
         * @name _array
         * @type {Float32Array}
         */
        this._array = vec3.fromValues(x, y, z);

        /**
         * Dirty flag is used by the Node to determine
         * if the matrix is updated to latest
         * @name _dirty
         * @type {boolean}
         */
        this._dirty = true;
    };

    Vector3.prototype = {

        constructor : Vector3,

        /**
         * Add b to self
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        add : function(b) {
            vec3.add(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Set x, y and z components
         * @param  {number}  x
         * @param  {number}  y
         * @param  {number}  z
         * @return {qtek.math.Vector3}
         */
        set : function(x, y, z) {
            this._array[0] = x;
            this._array[1] = y;
            this._array[2] = z;
            this._dirty = true;
            return this;
        },

        /**
         * Set x, y and z components from array
         * @param  {Float32Array|number[]} arr
         * @return {qtek.math.Vector3}
         */
        setArray : function(arr) {
            this._array[0] = arr[0];
            this._array[1] = arr[1];
            this._array[2] = arr[2];

            this._dirty = true;
            return this;
        },

        /**
         * Clone a new Vector3
         * @return {qtek.math.Vector3}
         */
        clone : function() {
            return new Vector3(this.x, this.y, this.z);
        },

        /**
         * Copy from b
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        copy : function(b) {
            vec3.copy(this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Cross product of self and b, written to a Vector3 out
         * @param  {qtek.math.Vector3} a
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        cross : function(a, b) {
            vec3.cross(this._array, a._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Alias for distance
         * @param  {qtek.math.Vector3} b
         * @return {number}
         */
        dist : function(b) {
            return vec3.dist(this._array, b._array);
        },

        /**
         * Distance between self and b
         * @param  {qtek.math.Vector3} b
         * @return {number}
         */
        distance : function(b) {
            return vec3.distance(this._array, b._array);
        },

        /**
         * Alias for divide
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        div : function(b) {
            vec3.div(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Divide self by b
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        divide : function(b) {
            vec3.divide(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Dot product of self and b
         * @param  {qtek.math.Vector3} b
         * @return {number}
         */
        dot : function(b) {
            return vec3.dot(this._array, b._array);
        },

        /**
         * Alias of length
         * @return {number}
         */
        len : function() {
            return vec3.len(this._array);
        },

        /**
         * Calculate the length
         * @return {number}
         */
        length : function() {
            return vec3.length(this._array);
        },
        /**
         * Linear interpolation between a and b
         * @param  {qtek.math.Vector3} a
         * @param  {qtek.math.Vector3} b
         * @param  {number}  t
         * @return {qtek.math.Vector3}
         */
        lerp : function(a, b, t) {
            vec3.lerp(this._array, a._array, b._array, t);
            this._dirty = true;
            return this;
        },

        /**
         * Minimum of self and b
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        min : function(b) {
            vec3.min(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Maximum of self and b
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        max : function(b) {
            vec3.max(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Alias for multiply
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        mul : function(b) {
            vec3.mul(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Mutiply self and b
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        multiply : function(b) {
            vec3.multiply(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Negate self
         * @return {qtek.math.Vector3}
         */
        negate : function() {
            vec3.negate(this._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Normalize self
         * @return {qtek.math.Vector3}
         */
        normalize : function() {
            vec3.normalize(this._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Generate random x, y, z components with a given scale
         * @param  {number} scale
         * @return {qtek.math.Vector3}
         */
        random : function(scale) {
            vec3.random(this._array, scale);
            this._dirty = true;
            return this;
        },

        /**
         * Scale self
         * @param  {number}  scale
         * @return {qtek.math.Vector3}
         */
        scale : function(s) {
            vec3.scale(this._array, this._array, s);
            this._dirty = true;
            return this;
        },

        /**
         * Scale b and add to self
         * @param  {qtek.math.Vector3} b
         * @param  {number}  scale
         * @return {qtek.math.Vector3}
         */
        scaleAndAdd : function(b, s) {
            vec3.scaleAndAdd(this._array, this._array, b._array, s);
            this._dirty = true;
            return this;
        },

        /**
         * Alias for squaredDistance
         * @param  {qtek.math.Vector3} b
         * @return {number}
         */
        sqrDist : function(b) {
            return vec3.sqrDist(this._array, b._array);
        },

        /**
         * Squared distance between self and b
         * @param  {qtek.math.Vector3} b
         * @return {number}
         */
        squaredDistance : function(b) {
            return vec3.squaredDistance(this._array, b._array);
        },

        /**
         * Alias for squaredLength
         * @return {number}
         */
        sqrLen : function() {
            return vec3.sqrLen(this._array);
        },

        /**
         * Squared length of self
         * @return {number}
         */
        squaredLength : function() {
            return vec3.squaredLength(this._array);
        },

        /**
         * Alias for subtract
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        sub : function(b) {
            vec3.sub(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Subtract b from self
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        subtract : function(b) {
            vec3.subtract(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Transform self with a Matrix3 m
         * @param  {qtek.math.Matrix3} m
         * @return {qtek.math.Vector3}
         */
        transformMat3 : function(m) {
            vec3.transformMat3(this._array, this._array, m._array);
            this._dirty = true;
            return this;
        },

        /**
         * Transform self with a Matrix4 m
         * @param  {qtek.math.Matrix4} m
         * @return {qtek.math.Vector3}
         */
        transformMat4 : function(m) {
            vec3.transformMat4(this._array, this._array, m._array);
            this._dirty = true;
            return this;
        },
        /**
         * Transform self with a Quaternion q
         * @param  {qtek.math.Quaternion} q
         * @return {qtek.math.Vector3}
         */
        transformQuat : function(q) {
            vec3.transformQuat(this._array, this._array, q._array);
            this._dirty = true;
            return this;
        },

        /**
         * Trasnform self into projection space with m
         * @param  {qtek.math.Matrix4} m
         * @return {qtek.math.Vector3}
         */
        applyProjection : function(m) {
            var v = this._array;
            m = m._array;

            // Perspective projection
            if (m[15] === 0) {
                var w = -1 / v[2];
                v[0] = m[0] * v[0] * w;
                v[1] = m[5] * v[1] * w;
                v[2] = (m[10] * v[2] + m[14]) * w;
            } else {
                v[0] = m[0] * v[0] + m[12];
                v[1] = m[5] * v[1] + m[13];
                v[2] = m[10] * v[2] + m[14];
            }
            this._dirty = true;

            return this;
        },
        
        eulerFromQuaternion : function(q, order) {
            Vector3.eulerFromQuaternion(this, q, order);
        },

        toString : function() {
            return '[' + Array.prototype.join.call(this._array, ',') + ']';
        },
    };

    var defineProperty = Object.defineProperty;
    // Getter and Setter
    if (defineProperty) {

        var proto = Vector3.prototype;
        /**
         * @name x
         * @type {number}
         * @memberOf qtek.math.Vector3
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
         * @memberOf qtek.math.Vector3
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
         * @memberOf qtek.math.Vector3
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
    }


    // Supply methods that are not in place
    
    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    Vector3.add = function(out, a, b) {
        vec3.add(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector3} out
     * @param  {number}  x
     * @param  {number}  y
     * @param  {number}  z
     * @return {qtek.math.Vector3}  
     */
    Vector3.set = function(out, x, y, z) {
        vec3.set(out._array, x, y, z);
        out._dirty = true;
    };

    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    Vector3.copy = function(out, b) {
        vec3.copy(out._array, b._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    Vector3.cross = function(out, a, b) {
        vec3.cross(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {number}
     */
    Vector3.dist = function(a, b) {
        return vec3.distance(a._array, b._array);
    };

    /**
     * @method
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {number}
     */
    Vector3.distance = Vector3.dist;

    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    Vector3.div = function(out, a, b) {
        vec3.divide(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };

    /**
     * @method
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    Vector3.divide = Vector3.div;

    /**
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {number}
     */
    Vector3.dot = function(a, b) {
        return vec3.dot(a._array, b._array);
    };

    /**
     * @param  {qtek.math.Vector3} a
     * @return {number}
     */
    Vector3.len = function(b) {
        return vec3.length(b._array);
    };

    // Vector3.length = Vector3.len;

    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @param  {number}  t
     * @return {qtek.math.Vector3}
     */
    Vector3.lerp = function(out, a, b, t) {
        vec3.lerp(out._array, a._array, b._array, t);
        out._dirty = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    Vector3.min = function(out, a, b) {
        vec3.min(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    Vector3.max = function(out, a, b) {
        vec3.max(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    Vector3.mul = function(out, a, b) {
        vec3.multiply(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };
    /**
     * @method
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    Vector3.multiply = Vector3.mul;
    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @return {qtek.math.Vector3}
     */
    Vector3.negate = function(out, a) {
        vec3.negate(out._array, a._array);
        out._dirty = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @return {qtek.math.Vector3}
     */
    Vector3.normalize = function(out, a) {
        vec3.normalize(out._array, a._array);
        out._dirty = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector3} out
     * @param  {number}  scale
     * @return {qtek.math.Vector3}
     */
    Vector3.random = function(out, scale) {
        vec3.random(out._array, scale);
        out._dirty = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {number}  scale
     * @return {qtek.math.Vector3}
     */
    Vector3.scale = function(out, a, scale) {
        vec3.scale(out._array, a._array, scale);
        out._dirty = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @param  {number}  scale
     * @return {qtek.math.Vector3}
     */
    Vector3.scaleAndAdd = function(out, a, b, scale) {
        vec3.scaleAndAdd(out._array, a._array, b._array, scale);
        out._dirty = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {number}
     */
    Vector3.sqrDist = function(a, b) {
        return vec3.sqrDist(a._array, b._array);
    };
    /**
     * @method
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {number}
     */
    Vector3.squaredDistance = Vector3.sqrDist;
    /**
     * @param  {qtek.math.Vector3} a
     * @return {number}
     */
    Vector3.sqrLen = function(a) {
        return vec3.sqrLen(a._array);
    };
    /**
     * @method
     * @param  {qtek.math.Vector3} a
     * @return {number}
     */
    Vector3.squaredLength = Vector3.sqrLen;

    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    Vector3.sub = function(out, a, b) {
        vec3.subtract(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };
    /**
     * @method
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    Vector3.subtract = Vector3.sub;

    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {Matrix3} m
     * @return {qtek.math.Vector3}
     */
    Vector3.transformMat3 = function(out, a, m) {
        vec3.transformMat3(out._array, a._array, m._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Matrix4} m
     * @return {qtek.math.Vector3}
     */
    Vector3.transformMat4 = function(out, a, m) {
        vec3.transformMat4(out._array, a._array, m._array);
        out._dirty = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Quaternion} q
     * @return {qtek.math.Vector3}
     */
    Vector3.transformQuat = function(out, a, q) {
        vec3.transformQuat(out._array, a._array, q._array);
        out._dirty = true;
        return out;
    };

    function clamp(val, min, max) {
        return val < min ? min : (val > max ? max : val);
    };
    /**
     * Convert quaternion to euler angle
     * Quaternion must be normalized
     * From three.js
     */
    Vector3.eulerFromQuaternion = function (v, q, order) {
        v = v._array;
        q = q._array;
        var x = q[0], y = q[1], z = q[2], w = q[3];
        var x2 = x * x;
        var y2 = y * y;
        var z2 = z * z;
        var w2 = w * w;
        var atan2 = Math.atan2;
        var asin = Math.asin;
        switch (order && order.toUpperCase()) {
            case 'YXZ':
                v[0] = asin(clamp(2 * (x * w - y * z), - 1, 1));
                v[1] = atan2(2 * (x * z + y * w), (w2 - x2 - y2 + z2));
                v[2] = atan2(2 * (x * y + z * w), (w2 - x2 + y2 - z2));
                break;
            case 'ZXY':
                v[0] = asin(clamp(2 * (x * w + y * z), - 1, 1));
                v[1] = atan2(2 * (y * w - z * x), (w2 - x2 - y2 + z2));
                v[2] = atan2(2 * (z * w - x * y), (w2 - x2 + y2 - z2));
                break;
            case 'ZYX':
                v[0] = atan2(2 * (x * w + z * y), (w2 - x2 - y2 + z2));
                v[1] = asin(clamp(2 * (y * w - x * z), - 1, 1));
                v[2] = atan2(2 * (x * y + z * w), (w2 + x2 - y2 - z2));
                break;
            case 'YZX':
                v[0] = atan2(2 * (x * w - z * y), (w2 - x2 + y2 - z2));
                v[1] = atan2(2 * (y * w - x * z), (w2 + x2 - y2 - z2));
                v[2] = asin(clamp(2 * (x * y + z * w), - 1, 1));
                break;
            case 'XZY':
                v[0] = atan2(2 * (x * w + y * z), (w2 - x2 + y2 - z2));
                v[1] = atan2(2 * (x * z + y * w), (w2 + x2 - y2 - z2));
                v[2] = asin(clamp(2 * (z * w - x * y), - 1, 1));
                break;
            case 'XYZ':
            default:
                v[0] = atan2(2 * (x * w - y * z), (w2 - x2 - y2 + z2));
                v[1] = asin(clamp(2 * (x * z + y * w), - 1, 1));
                v[2] = atan2(2 * (z * w - x * y), (w2 + x2 - y2 - z2));
                break;
        }
        v._dirty = true;
        return v;
    };

    /**
     * @type {qtek.math.Vector3}
     */
    Vector3.POSITIVE_X = new Vector3(1, 0, 0);
    /**
     * @type {qtek.math.Vector3}
     */
    Vector3.NEGATIVE_X = new Vector3(-1, 0, 0);
    /**
     * @type {qtek.math.Vector3}
     */
    Vector3.POSITIVE_Y = new Vector3(0, 1, 0);
    /**
     * @type {qtek.math.Vector3}
     */
    Vector3.NEGATIVE_Y = new Vector3(0, -1, 0);
    /**
     * @type {qtek.math.Vector3}
     */
    Vector3.POSITIVE_Z = new Vector3(0, 0, 1);
    /**
     * @type {qtek.math.Vector3}
     */
    Vector3.NEGATIVE_Z = new Vector3(0, 0, -1);
    /**
     * @type {qtek.math.Vector3}
     */
    Vector3.UP = new Vector3(0, 1, 0);
    /**
     * @type {qtek.math.Vector3}
     */
    Vector3.ZERO = new Vector3(0, 0, 0);

    return Vector3;
});