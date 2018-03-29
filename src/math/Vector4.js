import vec4 from '../glmatrix/vec4';

/**
 * @constructor
 * @alias clay.Vector4
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
     * Storage of Vector4, read and write of x, y, z, w will change the values in array
     * All methods also operate on the array instead of x, y, z, w components
     * @name array
     * @type {Float32Array}
     * @memberOf clay.Vector4#
     */
    this.array = vec4.fromValues(x, y, z, w);

    /**
     * Dirty flag is used by the Node to determine
     * if the matrix is updated to latest
     * @name _dirty
     * @type {boolean}
     * @memberOf clay.Vector4#
     */
    this._dirty = true;
};

Vector4.prototype = {

    constructor: Vector4,

    /**
     * Add b to self
     * @param  {clay.Vector4} b
     * @return {clay.Vector4}
     */
    add: function(b) {
        vec4.add(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Set x, y and z components
     * @param  {number}  x
     * @param  {number}  y
     * @param  {number}  z
     * @param  {number}  w
     * @return {clay.Vector4}
     */
    set: function(x, y, z, w) {
        this.array[0] = x;
        this.array[1] = y;
        this.array[2] = z;
        this.array[3] = w;
        this._dirty = true;
        return this;
    },

    /**
     * Set x, y, z and w components from array
     * @param  {Float32Array|number[]} arr
     * @return {clay.Vector4}
     */
    setArray: function(arr) {
        this.array[0] = arr[0];
        this.array[1] = arr[1];
        this.array[2] = arr[2];
        this.array[3] = arr[3];

        this._dirty = true;
        return this;
    },

    /**
     * Clone a new Vector4
     * @return {clay.Vector4}
     */
    clone: function() {
        return new Vector4(this.x, this.y, this.z, this.w);
    },

    /**
     * Copy from b
     * @param  {clay.Vector4} b
     * @return {clay.Vector4}
     */
    copy: function(b) {
        vec4.copy(this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for distance
     * @param  {clay.Vector4} b
     * @return {number}
     */
    dist: function(b) {
        return vec4.dist(this.array, b.array);
    },

    /**
     * Distance between self and b
     * @param  {clay.Vector4} b
     * @return {number}
     */
    distance: function(b) {
        return vec4.distance(this.array, b.array);
    },

    /**
     * Alias for divide
     * @param  {clay.Vector4} b
     * @return {clay.Vector4}
     */
    div: function(b) {
        vec4.div(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Divide self by b
     * @param  {clay.Vector4} b
     * @return {clay.Vector4}
     */
    divide: function(b) {
        vec4.divide(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Dot product of self and b
     * @param  {clay.Vector4} b
     * @return {number}
     */
    dot: function(b) {
        return vec4.dot(this.array, b.array);
    },

    /**
     * Alias of length
     * @return {number}
     */
    len: function() {
        return vec4.len(this.array);
    },

    /**
     * Calculate the length
     * @return {number}
     */
    length: function() {
        return vec4.length(this.array);
    },
    /**
     * Linear interpolation between a and b
     * @param  {clay.Vector4} a
     * @param  {clay.Vector4} b
     * @param  {number}  t
     * @return {clay.Vector4}
     */
    lerp: function(a, b, t) {
        vec4.lerp(this.array, a.array, b.array, t);
        this._dirty = true;
        return this;
    },

    /**
     * Minimum of self and b
     * @param  {clay.Vector4} b
     * @return {clay.Vector4}
     */
    min: function(b) {
        vec4.min(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Maximum of self and b
     * @param  {clay.Vector4} b
     * @return {clay.Vector4}
     */
    max: function(b) {
        vec4.max(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for multiply
     * @param  {clay.Vector4} b
     * @return {clay.Vector4}
     */
    mul: function(b) {
        vec4.mul(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Mutiply self and b
     * @param  {clay.Vector4} b
     * @return {clay.Vector4}
     */
    multiply: function(b) {
        vec4.multiply(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Negate self
     * @return {clay.Vector4}
     */
    negate: function() {
        vec4.negate(this.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Normalize self
     * @return {clay.Vector4}
     */
    normalize: function() {
        vec4.normalize(this.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Generate random x, y, z, w components with a given scale
     * @param  {number} scale
     * @return {clay.Vector4}
     */
    random: function(scale) {
        vec4.random(this.array, scale);
        this._dirty = true;
        return this;
    },

    /**
     * Scale self
     * @param  {number}  scale
     * @return {clay.Vector4}
     */
    scale: function(s) {
        vec4.scale(this.array, this.array, s);
        this._dirty = true;
        return this;
    },
    /**
     * Scale b and add to self
     * @param  {clay.Vector4} b
     * @param  {number}  scale
     * @return {clay.Vector4}
     */
    scaleAndAdd: function(b, s) {
        vec4.scaleAndAdd(this.array, this.array, b.array, s);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for squaredDistance
     * @param  {clay.Vector4} b
     * @return {number}
     */
    sqrDist: function(b) {
        return vec4.sqrDist(this.array, b.array);
    },

    /**
     * Squared distance between self and b
     * @param  {clay.Vector4} b
     * @return {number}
     */
    squaredDistance: function(b) {
        return vec4.squaredDistance(this.array, b.array);
    },

    /**
     * Alias for squaredLength
     * @return {number}
     */
    sqrLen: function() {
        return vec4.sqrLen(this.array);
    },

    /**
     * Squared length of self
     * @return {number}
     */
    squaredLength: function() {
        return vec4.squaredLength(this.array);
    },

    /**
     * Alias for subtract
     * @param  {clay.Vector4} b
     * @return {clay.Vector4}
     */
    sub: function(b) {
        vec4.sub(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Subtract b from self
     * @param  {clay.Vector4} b
     * @return {clay.Vector4}
     */
    subtract: function(b) {
        vec4.subtract(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Transform self with a Matrix4 m
     * @param  {clay.Matrix4} m
     * @return {clay.Vector4}
     */
    transformMat4: function(m) {
        vec4.transformMat4(this.array, this.array, m.array);
        this._dirty = true;
        return this;
    },

    /**
     * Transform self with a Quaternion q
     * @param  {clay.Quaternion} q
     * @return {clay.Vector4}
     */
    transformQuat: function(q) {
        vec4.transformQuat(this.array, this.array, q.array);
        this._dirty = true;
        return this;
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

    var proto = Vector4.prototype;
    /**
     * @name x
     * @type {number}
     * @memberOf clay.Vector4
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
     * @memberOf clay.Vector4
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
     * @memberOf clay.Vector4
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

    /**
     * @name w
     * @type {number}
     * @memberOf clay.Vector4
     * @instance
     */
    defineProperty(proto, 'w', {
        get: function () {
            return this.array[3];
        },
        set: function (value) {
            this.array[3] = value;
            this._dirty = true;
        }
    });
}

// Supply methods that are not in place

/**
 * @param  {clay.Vector4} out
 * @param  {clay.Vector4} a
 * @param  {clay.Vector4} b
 * @return {clay.Vector4}
 */
Vector4.add = function(out, a, b) {
    vec4.add(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Vector4} out
 * @param  {number}  x
 * @param  {number}  y
 * @param  {number}  z
 * @return {clay.Vector4}
 */
Vector4.set = function(out, x, y, z, w) {
    vec4.set(out.array, x, y, z, w);
    out._dirty = true;
};

/**
 * @param  {clay.Vector4} out
 * @param  {clay.Vector4} b
 * @return {clay.Vector4}
 */
Vector4.copy = function(out, b) {
    vec4.copy(out.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Vector4} a
 * @param  {clay.Vector4} b
 * @return {number}
 */
Vector4.dist = function(a, b) {
    return vec4.distance(a.array, b.array);
};

/**
 * @function
 * @param  {clay.Vector4} a
 * @param  {clay.Vector4} b
 * @return {number}
 */
Vector4.distance = Vector4.dist;

/**
 * @param  {clay.Vector4} out
 * @param  {clay.Vector4} a
 * @param  {clay.Vector4} b
 * @return {clay.Vector4}
 */
Vector4.div = function(out, a, b) {
    vec4.divide(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @function
 * @param  {clay.Vector4} out
 * @param  {clay.Vector4} a
 * @param  {clay.Vector4} b
 * @return {clay.Vector4}
 */
Vector4.divide = Vector4.div;

/**
 * @param  {clay.Vector4} a
 * @param  {clay.Vector4} b
 * @return {number}
 */
Vector4.dot = function(a, b) {
    return vec4.dot(a.array, b.array);
};

/**
 * @param  {clay.Vector4} a
 * @return {number}
 */
Vector4.len = function(b) {
    return vec4.length(b.array);
};

// Vector4.length = Vector4.len;

/**
 * @param  {clay.Vector4} out
 * @param  {clay.Vector4} a
 * @param  {clay.Vector4} b
 * @param  {number}  t
 * @return {clay.Vector4}
 */
Vector4.lerp = function(out, a, b, t) {
    vec4.lerp(out.array, a.array, b.array, t);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Vector4} out
 * @param  {clay.Vector4} a
 * @param  {clay.Vector4} b
 * @return {clay.Vector4}
 */
Vector4.min = function(out, a, b) {
    vec4.min(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Vector4} out
 * @param  {clay.Vector4} a
 * @param  {clay.Vector4} b
 * @return {clay.Vector4}
 */
Vector4.max = function(out, a, b) {
    vec4.max(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Vector4} out
 * @param  {clay.Vector4} a
 * @param  {clay.Vector4} b
 * @return {clay.Vector4}
 */
Vector4.mul = function(out, a, b) {
    vec4.multiply(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @function
 * @param  {clay.Vector4} out
 * @param  {clay.Vector4} a
 * @param  {clay.Vector4} b
 * @return {clay.Vector4}
 */
Vector4.multiply = Vector4.mul;

/**
 * @param  {clay.Vector4} out
 * @param  {clay.Vector4} a
 * @return {clay.Vector4}
 */
Vector4.negate = function(out, a) {
    vec4.negate(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Vector4} out
 * @param  {clay.Vector4} a
 * @return {clay.Vector4}
 */
Vector4.normalize = function(out, a) {
    vec4.normalize(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Vector4} out
 * @param  {number}  scale
 * @return {clay.Vector4}
 */
Vector4.random = function(out, scale) {
    vec4.random(out.array, scale);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Vector4} out
 * @param  {clay.Vector4} a
 * @param  {number}  scale
 * @return {clay.Vector4}
 */
Vector4.scale = function(out, a, scale) {
    vec4.scale(out.array, a.array, scale);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Vector4} out
 * @param  {clay.Vector4} a
 * @param  {clay.Vector4} b
 * @param  {number}  scale
 * @return {clay.Vector4}
 */
Vector4.scaleAndAdd = function(out, a, b, scale) {
    vec4.scaleAndAdd(out.array, a.array, b.array, scale);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Vector4} a
 * @param  {clay.Vector4} b
 * @return {number}
 */
Vector4.sqrDist = function(a, b) {
    return vec4.sqrDist(a.array, b.array);
};

/**
 * @function
 * @param  {clay.Vector4} a
 * @param  {clay.Vector4} b
 * @return {number}
 */
Vector4.squaredDistance = Vector4.sqrDist;

/**
 * @param  {clay.Vector4} a
 * @return {number}
 */
Vector4.sqrLen = function(a) {
    return vec4.sqrLen(a.array);
};
/**
 * @function
 * @param  {clay.Vector4} a
 * @return {number}
 */
Vector4.squaredLength = Vector4.sqrLen;

/**
 * @param  {clay.Vector4} out
 * @param  {clay.Vector4} a
 * @param  {clay.Vector4} b
 * @return {clay.Vector4}
 */
Vector4.sub = function(out, a, b) {
    vec4.subtract(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};
/**
 * @function
 * @param  {clay.Vector4} out
 * @param  {clay.Vector4} a
 * @param  {clay.Vector4} b
 * @return {clay.Vector4}
 */
Vector4.subtract = Vector4.sub;

/**
 * @param  {clay.Vector4} out
 * @param  {clay.Vector4} a
 * @param  {clay.Matrix4} m
 * @return {clay.Vector4}
 */
Vector4.transformMat4 = function(out, a, m) {
    vec4.transformMat4(out.array, a.array, m.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Vector4} out
 * @param  {clay.Vector4} a
 * @param  {clay.Quaternion} q
 * @return {clay.Vector4}
 */
Vector4.transformQuat = function(out, a, q) {
    vec4.transformQuat(out.array, a.array, q.array);
    out._dirty = true;
    return out;
};

export default Vector4;
