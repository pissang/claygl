import vec3 from '../glmatrix/vec3';

/**
 * @constructor
 * @alias clay.Vector3
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
var Vector3 = function(x, y, z) {

    x = x || 0;
    y = y || 0;
    z = z || 0;

    /**
     * Storage of Vector3, read and write of x, y, z will change the values in array
     * All methods also operate on the array instead of x, y, z components
     * @name array
     * @type {Float32Array}
     * @memberOf clay.Vector3#
     */
    this.array = vec3.fromValues(x, y, z);

    /**
     * Dirty flag is used by the Node to determine
     * if the matrix is updated to latest
     * @name _dirty
     * @type {boolean}
     * @memberOf clay.Vector3#
     */
    this._dirty = true;
};

Vector3.prototype = {

    constructor: Vector3,

    /**
     * Add b to self
     * @param  {clay.Vector3} b
     * @return {clay.Vector3}
     */
    add: function (b) {
        vec3.add(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Set x, y and z components
     * @param  {number}  x
     * @param  {number}  y
     * @param  {number}  z
     * @return {clay.Vector3}
     */
    set: function (x, y, z) {
        this.array[0] = x;
        this.array[1] = y;
        this.array[2] = z;
        this._dirty = true;
        return this;
    },

    /**
     * Set x, y and z components from array
     * @param  {Float32Array|number[]} arr
     * @return {clay.Vector3}
     */
    setArray: function (arr) {
        this.array[0] = arr[0];
        this.array[1] = arr[1];
        this.array[2] = arr[2];

        this._dirty = true;
        return this;
    },

    /**
     * Clone a new Vector3
     * @return {clay.Vector3}
     */
    clone: function () {
        return new Vector3(this.x, this.y, this.z);
    },

    /**
     * Copy from b
     * @param  {clay.Vector3} b
     * @return {clay.Vector3}
     */
    copy: function (b) {
        vec3.copy(this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Cross product of self and b, written to a Vector3 out
     * @param  {clay.Vector3} a
     * @param  {clay.Vector3} b
     * @return {clay.Vector3}
     */
    cross: function (a, b) {
        vec3.cross(this.array, a.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for distance
     * @param  {clay.Vector3} b
     * @return {number}
     */
    dist: function (b) {
        return vec3.dist(this.array, b.array);
    },

    /**
     * Distance between self and b
     * @param  {clay.Vector3} b
     * @return {number}
     */
    distance: function (b) {
        return vec3.distance(this.array, b.array);
    },

    /**
     * Alias for divide
     * @param  {clay.Vector3} b
     * @return {clay.Vector3}
     */
    div: function (b) {
        vec3.div(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Divide self by b
     * @param  {clay.Vector3} b
     * @return {clay.Vector3}
     */
    divide: function (b) {
        vec3.divide(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Dot product of self and b
     * @param  {clay.Vector3} b
     * @return {number}
     */
    dot: function (b) {
        return vec3.dot(this.array, b.array);
    },

    /**
     * Alias of length
     * @return {number}
     */
    len: function () {
        return vec3.len(this.array);
    },

    /**
     * Calculate the length
     * @return {number}
     */
    length: function () {
        return vec3.length(this.array);
    },
    /**
     * Linear interpolation between a and b
     * @param  {clay.Vector3} a
     * @param  {clay.Vector3} b
     * @param  {number}  t
     * @return {clay.Vector3}
     */
    lerp: function (a, b, t) {
        vec3.lerp(this.array, a.array, b.array, t);
        this._dirty = true;
        return this;
    },

    /**
     * Minimum of self and b
     * @param  {clay.Vector3} b
     * @return {clay.Vector3}
     */
    min: function (b) {
        vec3.min(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Maximum of self and b
     * @param  {clay.Vector3} b
     * @return {clay.Vector3}
     */
    max: function (b) {
        vec3.max(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for multiply
     * @param  {clay.Vector3} b
     * @return {clay.Vector3}
     */
    mul: function (b) {
        vec3.mul(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Mutiply self and b
     * @param  {clay.Vector3} b
     * @return {clay.Vector3}
     */
    multiply: function (b) {
        vec3.multiply(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Negate self
     * @return {clay.Vector3}
     */
    negate: function () {
        vec3.negate(this.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Normalize self
     * @return {clay.Vector3}
     */
    normalize: function () {
        vec3.normalize(this.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Generate random x, y, z components with a given scale
     * @param  {number} scale
     * @return {clay.Vector3}
     */
    random: function (scale) {
        vec3.random(this.array, scale);
        this._dirty = true;
        return this;
    },

    /**
     * Scale self
     * @param  {number}  scale
     * @return {clay.Vector3}
     */
    scale: function (s) {
        vec3.scale(this.array, this.array, s);
        this._dirty = true;
        return this;
    },

    /**
     * Scale b and add to self
     * @param  {clay.Vector3} b
     * @param  {number}  scale
     * @return {clay.Vector3}
     */
    scaleAndAdd: function (b, s) {
        vec3.scaleAndAdd(this.array, this.array, b.array, s);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for squaredDistance
     * @param  {clay.Vector3} b
     * @return {number}
     */
    sqrDist: function (b) {
        return vec3.sqrDist(this.array, b.array);
    },

    /**
     * Squared distance between self and b
     * @param  {clay.Vector3} b
     * @return {number}
     */
    squaredDistance: function (b) {
        return vec3.squaredDistance(this.array, b.array);
    },

    /**
     * Alias for squaredLength
     * @return {number}
     */
    sqrLen: function () {
        return vec3.sqrLen(this.array);
    },

    /**
     * Squared length of self
     * @return {number}
     */
    squaredLength: function () {
        return vec3.squaredLength(this.array);
    },

    /**
     * Alias for subtract
     * @param  {clay.Vector3} b
     * @return {clay.Vector3}
     */
    sub: function (b) {
        vec3.sub(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Subtract b from self
     * @param  {clay.Vector3} b
     * @return {clay.Vector3}
     */
    subtract: function (b) {
        vec3.subtract(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Transform self with a Matrix3 m
     * @param  {clay.Matrix3} m
     * @return {clay.Vector3}
     */
    transformMat3: function (m) {
        vec3.transformMat3(this.array, this.array, m.array);
        this._dirty = true;
        return this;
    },

    /**
     * Transform self with a Matrix4 m
     * @param  {clay.Matrix4} m
     * @return {clay.Vector3}
     */
    transformMat4: function (m) {
        vec3.transformMat4(this.array, this.array, m.array);
        this._dirty = true;
        return this;
    },
    /**
     * Transform self with a Quaternion q
     * @param  {clay.Quaternion} q
     * @return {clay.Vector3}
     */
    transformQuat: function (q) {
        vec3.transformQuat(this.array, this.array, q.array);
        this._dirty = true;
        return this;
    },

    /**
     * Trasnform self into projection space with m
     * @param  {clay.Matrix4} m
     * @return {clay.Vector3}
     */
    applyProjection: function (m) {
        var v = this.array;
        m = m.array;

        // Perspective projection
        if (m[15] === 0) {
            var w = -1 / v[2];
            v[0] = m[0] * v[0] * w;
            v[1] = m[5] * v[1] * w;
            v[2] = (m[10] * v[2] + m[14]) * w;
        }
        else {
            v[0] = m[0] * v[0] + m[12];
            v[1] = m[5] * v[1] + m[13];
            v[2] = m[10] * v[2] + m[14];
        }
        this._dirty = true;

        return this;
    },

    eulerFromQuat: function(q, order) {
        Vector3.eulerFromQuat(this, q, order);
    },

    eulerFromMat3: function (m, order) {
        Vector3.eulerFromMat3(this, m, order);
    },

    toString: function() {
        return '[' + Array.prototype.join.call(this.array, ',') + ']';
    },

    toArray: function () {
        return Array.prototype.slice.call(this.array);
    }
};

var defineProperty = Object.defineProperty;
// Getter and Setter
if (defineProperty) {

    var proto = Vector3.prototype;
    /**
     * @name x
     * @type {number}
     * @memberOf clay.Vector3
     * @instance
     */
    defineProperty(proto, 'x', {
        get: function () {
            return this.array[0];
        },
        set: function (value) {
            this.array[0] = value;
            this._dirty = true;
        }
    });

    /**
     * @name y
     * @type {number}
     * @memberOf clay.Vector3
     * @instance
     */
    defineProperty(proto, 'y', {
        get: function () {
            return this.array[1];
        },
        set: function (value) {
            this.array[1] = value;
            this._dirty = true;
        }
    });

    /**
     * @name z
     * @type {number}
     * @memberOf clay.Vector3
     * @instance
     */
    defineProperty(proto, 'z', {
        get: function () {
            return this.array[2];
        },
        set: function (value) {
            this.array[2] = value;
            this._dirty = true;
        }
    });
}


// Supply methods that are not in place

/**
 * @param  {clay.Vector3} out
 * @param  {clay.Vector3} a
 * @param  {clay.Vector3} b
 * @return {clay.Vector3}
 */
Vector3.add = function(out, a, b) {
    vec3.add(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Vector3} out
 * @param  {number}  x
 * @param  {number}  y
 * @param  {number}  z
 * @return {clay.Vector3}
 */
Vector3.set = function(out, x, y, z) {
    vec3.set(out.array, x, y, z);
    out._dirty = true;
};

/**
 * @param  {clay.Vector3} out
 * @param  {clay.Vector3} b
 * @return {clay.Vector3}
 */
Vector3.copy = function(out, b) {
    vec3.copy(out.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Vector3} out
 * @param  {clay.Vector3} a
 * @param  {clay.Vector3} b
 * @return {clay.Vector3}
 */
Vector3.cross = function(out, a, b) {
    vec3.cross(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Vector3} a
 * @param  {clay.Vector3} b
 * @return {number}
 */
Vector3.dist = function(a, b) {
    return vec3.distance(a.array, b.array);
};

/**
 * @function
 * @param  {clay.Vector3} a
 * @param  {clay.Vector3} b
 * @return {number}
 */
Vector3.distance = Vector3.dist;

/**
 * @param  {clay.Vector3} out
 * @param  {clay.Vector3} a
 * @param  {clay.Vector3} b
 * @return {clay.Vector3}
 */
Vector3.div = function(out, a, b) {
    vec3.divide(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @function
 * @param  {clay.Vector3} out
 * @param  {clay.Vector3} a
 * @param  {clay.Vector3} b
 * @return {clay.Vector3}
 */
Vector3.divide = Vector3.div;

/**
 * @param  {clay.Vector3} a
 * @param  {clay.Vector3} b
 * @return {number}
 */
Vector3.dot = function(a, b) {
    return vec3.dot(a.array, b.array);
};

/**
 * @param  {clay.Vector3} a
 * @return {number}
 */
Vector3.len = function(b) {
    return vec3.length(b.array);
};

// Vector3.length = Vector3.len;

/**
 * @param  {clay.Vector3} out
 * @param  {clay.Vector3} a
 * @param  {clay.Vector3} b
 * @param  {number}  t
 * @return {clay.Vector3}
 */
Vector3.lerp = function(out, a, b, t) {
    vec3.lerp(out.array, a.array, b.array, t);
    out._dirty = true;
    return out;
};
/**
 * @param  {clay.Vector3} out
 * @param  {clay.Vector3} a
 * @param  {clay.Vector3} b
 * @return {clay.Vector3}
 */
Vector3.min = function(out, a, b) {
    vec3.min(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Vector3} out
 * @param  {clay.Vector3} a
 * @param  {clay.Vector3} b
 * @return {clay.Vector3}
 */
Vector3.max = function(out, a, b) {
    vec3.max(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};
/**
 * @param  {clay.Vector3} out
 * @param  {clay.Vector3} a
 * @param  {clay.Vector3} b
 * @return {clay.Vector3}
 */
Vector3.mul = function(out, a, b) {
    vec3.multiply(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};
/**
 * @function
 * @param  {clay.Vector3} out
 * @param  {clay.Vector3} a
 * @param  {clay.Vector3} b
 * @return {clay.Vector3}
 */
Vector3.multiply = Vector3.mul;
/**
 * @param  {clay.Vector3} out
 * @param  {clay.Vector3} a
 * @return {clay.Vector3}
 */
Vector3.negate = function(out, a) {
    vec3.negate(out.array, a.array);
    out._dirty = true;
    return out;
};
/**
 * @param  {clay.Vector3} out
 * @param  {clay.Vector3} a
 * @return {clay.Vector3}
 */
Vector3.normalize = function(out, a) {
    vec3.normalize(out.array, a.array);
    out._dirty = true;
    return out;
};
/**
 * @param  {clay.Vector3} out
 * @param  {number}  scale
 * @return {clay.Vector3}
 */
Vector3.random = function(out, scale) {
    vec3.random(out.array, scale);
    out._dirty = true;
    return out;
};
/**
 * @param  {clay.Vector3} out
 * @param  {clay.Vector3} a
 * @param  {number}  scale
 * @return {clay.Vector3}
 */
Vector3.scale = function(out, a, scale) {
    vec3.scale(out.array, a.array, scale);
    out._dirty = true;
    return out;
};
/**
 * @param  {clay.Vector3} out
 * @param  {clay.Vector3} a
 * @param  {clay.Vector3} b
 * @param  {number}  scale
 * @return {clay.Vector3}
 */
Vector3.scaleAndAdd = function(out, a, b, scale) {
    vec3.scaleAndAdd(out.array, a.array, b.array, scale);
    out._dirty = true;
    return out;
};
/**
 * @param  {clay.Vector3} a
 * @param  {clay.Vector3} b
 * @return {number}
 */
Vector3.sqrDist = function(a, b) {
    return vec3.sqrDist(a.array, b.array);
};
/**
 * @function
 * @param  {clay.Vector3} a
 * @param  {clay.Vector3} b
 * @return {number}
 */
Vector3.squaredDistance = Vector3.sqrDist;
/**
 * @param  {clay.Vector3} a
 * @return {number}
 */
Vector3.sqrLen = function(a) {
    return vec3.sqrLen(a.array);
};
/**
 * @function
 * @param  {clay.Vector3} a
 * @return {number}
 */
Vector3.squaredLength = Vector3.sqrLen;

/**
 * @param  {clay.Vector3} out
 * @param  {clay.Vector3} a
 * @param  {clay.Vector3} b
 * @return {clay.Vector3}
 */
Vector3.sub = function(out, a, b) {
    vec3.subtract(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};
/**
 * @function
 * @param  {clay.Vector3} out
 * @param  {clay.Vector3} a
 * @param  {clay.Vector3} b
 * @return {clay.Vector3}
 */
Vector3.subtract = Vector3.sub;

/**
 * @param  {clay.Vector3} out
 * @param  {clay.Vector3} a
 * @param  {Matrix3} m
 * @return {clay.Vector3}
 */
Vector3.transformMat3 = function(out, a, m) {
    vec3.transformMat3(out.array, a.array, m.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Vector3} out
 * @param  {clay.Vector3} a
 * @param  {clay.Matrix4} m
 * @return {clay.Vector3}
 */
Vector3.transformMat4 = function(out, a, m) {
    vec3.transformMat4(out.array, a.array, m.array);
    out._dirty = true;
    return out;
};
/**
 * @param  {clay.Vector3} out
 * @param  {clay.Vector3} a
 * @param  {clay.Quaternion} q
 * @return {clay.Vector3}
 */
Vector3.transformQuat = function(out, a, q) {
    vec3.transformQuat(out.array, a.array, q.array);
    out._dirty = true;
    return out;
};

function clamp(val, min, max) {
    return val < min ? min : (val > max ? max : val);
}
var atan2 = Math.atan2;
var asin = Math.asin;
var abs = Math.abs;
/**
 * Convert quaternion to euler angle
 * Quaternion must be normalized
 * From three.js
 */
Vector3.eulerFromQuat = function (out, q, order) {
    out._dirty = true;
    q = q.array;

    var target = out.array;
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var x2 = x * x;
    var y2 = y * y;
    var z2 = z * z;
    var w2 = w * w;

    var order = (order || 'XYZ').toUpperCase();

    switch (order) {
        case 'XYZ':
            target[0] = atan2(2 * (x * w - y * z), (w2 - x2 - y2 + z2));
            target[1] = asin(clamp(2 * (x * z + y * w), - 1, 1));
            target[2] = atan2(2 * (z * w - x * y), (w2 + x2 - y2 - z2));
            break;
        case 'YXZ':
            target[0] = asin(clamp(2 * (x * w - y * z), - 1, 1));
            target[1] = atan2(2 * (x * z + y * w), (w2 - x2 - y2 + z2));
            target[2] = atan2(2 * (x * y + z * w), (w2 - x2 + y2 - z2));
            break;
        case 'ZXY':
            target[0] = asin(clamp(2 * (x * w + y * z), - 1, 1));
            target[1] = atan2(2 * (y * w - z * x), (w2 - x2 - y2 + z2));
            target[2] = atan2(2 * (z * w - x * y), (w2 - x2 + y2 - z2));
            break;
        case 'ZYX':
            target[0] = atan2(2 * (x * w + z * y), (w2 - x2 - y2 + z2));
            target[1] = asin(clamp(2 * (y * w - x * z), - 1, 1));
            target[2] = atan2(2 * (x * y + z * w), (w2 + x2 - y2 - z2));
            break;
        case 'YZX':
            target[0] = atan2(2 * (x * w - z * y), (w2 - x2 + y2 - z2));
            target[1] = atan2(2 * (y * w - x * z), (w2 + x2 - y2 - z2));
            target[2] = asin(clamp(2 * (x * y + z * w), - 1, 1));
            break;
        case 'XZY':
            target[0] = atan2(2 * (x * w + y * z), (w2 - x2 + y2 - z2));
            target[1] = atan2(2 * (x * z + y * w), (w2 + x2 - y2 - z2));
            target[2] = asin(clamp(2 * (z * w - x * y), - 1, 1));
            break;
        default:
            console.warn('Unkown order: ' + order);
    }
    return out;
};

/**
 * Convert rotation matrix to euler angle
 * from three.js
 */
Vector3.eulerFromMat3 = function (out, m, order) {
    // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)
    var te = m.array;
    var m11 = te[0], m12 = te[3], m13 = te[6];
    var m21 = te[1], m22 = te[4], m23 = te[7];
    var m31 = te[2], m32 = te[5], m33 = te[8];
    var target = out.array;

    var order = (order || 'XYZ').toUpperCase();

    switch (order) {
        case 'XYZ':
            target[1] = asin(clamp(m13, -1, 1));
            if (abs(m13) < 0.99999) {
                target[0] = atan2(-m23, m33);
                target[2] = atan2(-m12, m11);
            }
            else {
                target[0] = atan2(m32, m22);
                target[2] = 0;
            }
            break;
        case 'YXZ':
            target[0] = asin(-clamp(m23, -1, 1));
            if (abs(m23) < 0.99999) {
                target[1] = atan2(m13, m33);
                target[2] = atan2(m21, m22);
            }
            else {
                target[1] = atan2(-m31, m11);
                target[2] = 0;
            }
            break;
        case 'ZXY':
            target[0] = asin(clamp(m32, -1, 1));
            if (abs(m32) < 0.99999) {
                target[1] = atan2(-m31, m33);
                target[2] = atan2(-m12, m22);
            }
            else {
                target[1] = 0;
                target[2] = atan2(m21, m11);
            }
            break;
        case 'ZYX':
            target[1] = asin(-clamp(m31, -1, 1));
            if (abs(m31) < 0.99999) {
                target[0] = atan2(m32, m33);
                target[2] = atan2(m21, m11);
            }
            else {
                target[0] = 0;
                target[2] = atan2(-m12, m22);
            }
            break;
        case 'YZX':
            target[2] = asin(clamp(m21, -1, 1));
            if (abs(m21) < 0.99999) {
                target[0] = atan2(-m23, m22);
                target[1] = atan2(-m31, m11);
            }
            else {
                target[0] = 0;
                target[1] = atan2(m13, m33);
            }
            break;
        case 'XZY':
            target[2] = asin(-clamp(m12, -1, 1));
            if (abs(m12) < 0.99999) {
                target[0] = atan2(m32, m22);
                target[1] = atan2(m13, m11);
            }
            else {
                target[0] = atan2(-m23, m33);
                target[1] = 0;
            }
            break;
        default:
            console.warn('Unkown order: ' + order);
    }
    out._dirty = true;

    return out;
};

Object.defineProperties(Vector3, {
    /**
     * @type {clay.Vector3}
     * @readOnly
     * @memberOf clay.Vector3
     */
    POSITIVE_X: {
        get: function () {
            return new Vector3(1, 0, 0);
        }
    },
    /**
     * @type {clay.Vector3}
     * @readOnly
     * @memberOf clay.Vector3
     */
    NEGATIVE_X: {
        get: function () {
            return new Vector3(-1, 0, 0);
        }
    },
    /**
     * @type {clay.Vector3}
     * @readOnly
     * @memberOf clay.Vector3
     */
    POSITIVE_Y: {
        get: function () {
            return new Vector3(0, 1, 0);
        }
    },
    /**
     * @type {clay.Vector3}
     * @readOnly
     * @memberOf clay.Vector3
     */
    NEGATIVE_Y: {
        get: function () {
            return new Vector3(0, -1, 0);
        }
    },
    /**
     * @type {clay.Vector3}
     * @readOnly
     * @memberOf clay.Vector3
     */
    POSITIVE_Z: {
        get: function () {
            return new Vector3(0, 0, 1);
        }
    },
    /**
     * @type {clay.Vector3}
     * @readOnly
     */
    NEGATIVE_Z: {
        get: function () {
            return new Vector3(0, 0, -1);
        }
    },
    /**
     * @type {clay.Vector3}
     * @readOnly
     * @memberOf clay.Vector3
     */
    UP: {
        get: function () {
            return new Vector3(0, 1, 0);
        }
    },
    /**
     * @type {clay.Vector3}
     * @readOnly
     * @memberOf clay.Vector3
     */
    ZERO: {
        get: function () {
            return new Vector3();
        }
    }
});

export default Vector3;
