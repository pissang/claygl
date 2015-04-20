define(function(require) {
    
    'use strict';

    var glMatrix = require('../dep/glmatrix');
    var vec3 = glMatrix.vec3;

    var KEY_ARRAY = '_array';
    var KEY_DIRTY = '_dirty';

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
        this[KEY_ARRAY] = vec3.fromValues(x, y, z);

        /**
         * Dirty flag is used by the Node to determine
         * if the matrix is updated to latest
         * @name _dirty
         * @type {boolean}
         */
        this[KEY_DIRTY] = true;
    };

    Vector3.prototype= {

        constructor : Vector3,

        /**
         * Add b to self
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        add : function(b) {
            vec3.add(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
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
            this[KEY_ARRAY][0] = x;
            this[KEY_ARRAY][1] = y;
            this[KEY_ARRAY][2] = z;
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Set x, y and z components from array
         * @param  {Float32Array|number[]} arr
         * @return {qtek.math.Vector3}
         */
        setArray : function(arr) {
            this[KEY_ARRAY][0] = arr[0];
            this[KEY_ARRAY][1] = arr[1];
            this[KEY_ARRAY][2] = arr[2];

            this[KEY_DIRTY] = true;
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
            vec3.copy(this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Cross product of self and b, written to a Vector3 out
         * @param  {qtek.math.Vector3} a
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        cross : function(a, b) {
            vec3.cross(this[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Alias for distance
         * @param  {qtek.math.Vector3} b
         * @return {number}
         */
        dist : function(b) {
            return vec3.dist(this[KEY_ARRAY], b[KEY_ARRAY]);
        },

        /**
         * Distance between self and b
         * @param  {qtek.math.Vector3} b
         * @return {number}
         */
        distance : function(b) {
            return vec3.distance(this[KEY_ARRAY], b[KEY_ARRAY]);
        },

        /**
         * Alias for divide
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        div : function(b) {
            vec3.div(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Divide self by b
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        divide : function(b) {
            vec3.divide(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Dot product of self and b
         * @param  {qtek.math.Vector3} b
         * @return {number}
         */
        dot : function(b) {
            return vec3.dot(this[KEY_ARRAY], b[KEY_ARRAY]);
        },

        /**
         * Alias of length
         * @return {number}
         */
        len : function() {
            return vec3.len(this[KEY_ARRAY]);
        },

        /**
         * Calculate the length
         * @return {number}
         */
        length : function() {
            return vec3.length(this[KEY_ARRAY]);
        },
        /**
         * Linear interpolation between a and b
         * @param  {qtek.math.Vector3} a
         * @param  {qtek.math.Vector3} b
         * @param  {number}  t
         * @return {qtek.math.Vector3}
         */
        lerp : function(a, b, t) {
            vec3.lerp(this[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY], t);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Minimum of self and b
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        min : function(b) {
            vec3.min(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Maximum of self and b
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        max : function(b) {
            vec3.max(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Alias for multiply
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        mul : function(b) {
            vec3.mul(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Mutiply self and b
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        multiply : function(b) {
            vec3.multiply(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Negate self
         * @return {qtek.math.Vector3}
         */
        negate : function() {
            vec3.negate(this[KEY_ARRAY], this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Normalize self
         * @return {qtek.math.Vector3}
         */
        normalize : function() {
            vec3.normalize(this[KEY_ARRAY], this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Generate random x, y, z components with a given scale
         * @param  {number} scale
         * @return {qtek.math.Vector3}
         */
        random : function(scale) {
            vec3.random(this[KEY_ARRAY], scale);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Scale self
         * @param  {number}  scale
         * @return {qtek.math.Vector3}
         */
        scale : function(s) {
            vec3.scale(this[KEY_ARRAY], this[KEY_ARRAY], s);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Scale b and add to self
         * @param  {qtek.math.Vector3} b
         * @param  {number}  scale
         * @return {qtek.math.Vector3}
         */
        scaleAndAdd : function(b, s) {
            vec3.scaleAndAdd(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY], s);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Alias for squaredDistance
         * @param  {qtek.math.Vector3} b
         * @return {number}
         */
        sqrDist : function(b) {
            return vec3.sqrDist(this[KEY_ARRAY], b[KEY_ARRAY]);
        },

        /**
         * Squared distance between self and b
         * @param  {qtek.math.Vector3} b
         * @return {number}
         */
        squaredDistance : function(b) {
            return vec3.squaredDistance(this[KEY_ARRAY], b[KEY_ARRAY]);
        },

        /**
         * Alias for squaredLength
         * @return {number}
         */
        sqrLen : function() {
            return vec3.sqrLen(this[KEY_ARRAY]);
        },

        /**
         * Squared length of self
         * @return {number}
         */
        squaredLength : function() {
            return vec3.squaredLength(this[KEY_ARRAY]);
        },

        /**
         * Alias for subtract
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        sub : function(b) {
            vec3.sub(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Subtract b from self
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Vector3}
         */
        subtract : function(b) {
            vec3.subtract(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Transform self with a Matrix3 m
         * @param  {qtek.math.Matrix3} m
         * @return {qtek.math.Vector3}
         */
        transformMat3 : function(m) {
            vec3.transformMat3(this[KEY_ARRAY], this[KEY_ARRAY], m[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Transform self with a Matrix4 m
         * @param  {qtek.math.Matrix4} m
         * @return {qtek.math.Vector3}
         */
        transformMat4 : function(m) {
            vec3.transformMat4(this[KEY_ARRAY], this[KEY_ARRAY], m[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },
        /**
         * Transform self with a Quaternion q
         * @param  {qtek.math.Quaternion} q
         * @return {qtek.math.Vector3}
         */
        transformQuat : function(q) {
            vec3.transformQuat(this[KEY_ARRAY], this[KEY_ARRAY], q[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Trasnform self into projection space with m
         * @param  {qtek.math.Matrix4} m
         * @return {qtek.math.Vector3}
         */
        applyProjection : function(m) {
            var v = this[KEY_ARRAY];
            m = m[KEY_ARRAY];

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
            this[KEY_DIRTY] = true;

            return this;
        },
        
        eulerFromQuaternion : function(q, order) {
            Vector3.eulerFromQuaternion(this, q, order);
        },

        toString : function() {
            return '[' + Array.prototype.join.call(this[KEY_ARRAY], ',') + ']';
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
         * @memberOf qtek.math.Vector3
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
         * @memberOf qtek.math.Vector3
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
    }


    // Supply methods that are not in place
    
    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    Vector3.add = function(out, a, b) {
        vec3.add(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
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
        vec3.set(out[KEY_ARRAY], x, y, z);
        out[KEY_DIRTY] = true;
    };

    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    Vector3.copy = function(out, b) {
        vec3.copy(out[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    Vector3.cross = function(out, a, b) {
        vec3.cross(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {number}
     */
    Vector3.dist = function(a, b) {
        return vec3.distance(a[KEY_ARRAY], b[KEY_ARRAY]);
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
        vec3.divide(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
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
        return vec3.dot(a[KEY_ARRAY], b[KEY_ARRAY]);
    };

    /**
     * @param  {qtek.math.Vector3} a
     * @return {number}
     */
    Vector3.len = function(b) {
        return vec3.length(b[KEY_ARRAY]);
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
        vec3.lerp(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY], t);
        out[KEY_DIRTY] = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    Vector3.min = function(out, a, b) {
        vec3.min(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    Vector3.max = function(out, a, b) {
        vec3.max(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    Vector3.mul = function(out, a, b) {
        vec3.multiply(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
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
        vec3.negate(out[KEY_ARRAY], a[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @return {qtek.math.Vector3}
     */
    Vector3.normalize = function(out, a) {
        vec3.normalize(out[KEY_ARRAY], a[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector3} out
     * @param  {number}  scale
     * @return {qtek.math.Vector3}
     */
    Vector3.random = function(out, scale) {
        vec3.random(out[KEY_ARRAY], scale);
        out[KEY_DIRTY] = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {number}  scale
     * @return {qtek.math.Vector3}
     */
    Vector3.scale = function(out, a, scale) {
        vec3.scale(out[KEY_ARRAY], a[KEY_ARRAY], scale);
        out[KEY_DIRTY] = true;
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
        vec3.scaleAndAdd(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY], scale);
        out[KEY_DIRTY] = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {number}
     */
    Vector3.sqrDist = function(a, b) {
        return vec3.sqrDist(a[KEY_ARRAY], b[KEY_ARRAY]);
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
        return vec3.sqrLen(a[KEY_ARRAY]);
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
        vec3.subtract(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
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
        vec3.transformMat3(out[KEY_ARRAY], a[KEY_ARRAY], m[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Matrix4} m
     * @return {qtek.math.Vector3}
     */
    Vector3.transformMat4 = function(out, a, m) {
        vec3.transformMat4(out[KEY_ARRAY], a[KEY_ARRAY], m[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };
    /**
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Quaternion} q
     * @return {qtek.math.Vector3}
     */
    Vector3.transformQuat = function(out, a, q) {
        vec3.transformQuat(out[KEY_ARRAY], a[KEY_ARRAY], q[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
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
        v = v[KEY_ARRAY];
        q = q[KEY_ARRAY];
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
        v[KEY_DIRTY] = true;
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