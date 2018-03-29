import vec2 from '../glmatrix/vec2';

/**
 * @constructor
 * @alias clay.Vector2
 * @param {number} x
 * @param {number} y
 */
var Vector2 = function(x, y) {

    x = x || 0;
    y = y || 0;

    /**
     * Storage of Vector2, read and write of x, y will change the values in array
     * All methods also operate on the array instead of x, y components
     * @name array
     * @type {Float32Array}
     * @memberOf clay.Vector2#
     */
    this.array = vec2.fromValues(x, y);

    /**
     * Dirty flag is used by the Node to determine
     * if the matrix is updated to latest
     * @name _dirty
     * @type {boolean}
     * @memberOf clay.Vector2#
     */
    this._dirty = true;
};

Vector2.prototype = {

    constructor: Vector2,

    /**
     * Add b to self
     * @param  {clay.Vector2} b
     * @return {clay.Vector2}
     */
    add: function(b) {
        vec2.add(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Set x and y components
     * @param  {number}  x
     * @param  {number}  y
     * @return {clay.Vector2}
     */
    set: function(x, y) {
        this.array[0] = x;
        this.array[1] = y;
        this._dirty = true;
        return this;
    },

    /**
     * Set x and y components from array
     * @param  {Float32Array|number[]} arr
     * @return {clay.Vector2}
     */
    setArray: function(arr) {
        this.array[0] = arr[0];
        this.array[1] = arr[1];

        this._dirty = true;
        return this;
    },

    /**
     * Clone a new Vector2
     * @return {clay.Vector2}
     */
    clone: function() {
        return new Vector2(this.x, this.y);
    },

    /**
     * Copy x, y from b
     * @param  {clay.Vector2} b
     * @return {clay.Vector2}
     */
    copy: function(b) {
        vec2.copy(this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Cross product of self and b, written to a Vector3 out
     * @param  {clay.Vector3} out
     * @param  {clay.Vector2} b
     * @return {clay.Vector2}
     */
    cross: function(out, b) {
        vec2.cross(out.array, this.array, b.array);
        out._dirty = true;
        return this;
    },

    /**
     * Alias for distance
     * @param  {clay.Vector2} b
     * @return {number}
     */
    dist: function(b) {
        return vec2.dist(this.array, b.array);
    },

    /**
     * Distance between self and b
     * @param  {clay.Vector2} b
     * @return {number}
     */
    distance: function(b) {
        return vec2.distance(this.array, b.array);
    },

    /**
     * Alias for divide
     * @param  {clay.Vector2} b
     * @return {clay.Vector2}
     */
    div: function(b) {
        vec2.div(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Divide self by b
     * @param  {clay.Vector2} b
     * @return {clay.Vector2}
     */
    divide: function(b) {
        vec2.divide(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Dot product of self and b
     * @param  {clay.Vector2} b
     * @return {number}
     */
    dot: function(b) {
        return vec2.dot(this.array, b.array);
    },

    /**
     * Alias of length
     * @return {number}
     */
    len: function() {
        return vec2.len(this.array);
    },

    /**
     * Calculate the length
     * @return {number}
     */
    length: function() {
        return vec2.length(this.array);
    },

    /**
     * Linear interpolation between a and b
     * @param  {clay.Vector2} a
     * @param  {clay.Vector2} b
     * @param  {number}  t
     * @return {clay.Vector2}
     */
    lerp: function(a, b, t) {
        vec2.lerp(this.array, a.array, b.array, t);
        this._dirty = true;
        return this;
    },

    /**
     * Minimum of self and b
     * @param  {clay.Vector2} b
     * @return {clay.Vector2}
     */
    min: function(b) {
        vec2.min(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Maximum of self and b
     * @param  {clay.Vector2} b
     * @return {clay.Vector2}
     */
    max: function(b) {
        vec2.max(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for multiply
     * @param  {clay.Vector2} b
     * @return {clay.Vector2}
     */
    mul: function(b) {
        vec2.mul(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Mutiply self and b
     * @param  {clay.Vector2} b
     * @return {clay.Vector2}
     */
    multiply: function(b) {
        vec2.multiply(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Negate self
     * @return {clay.Vector2}
     */
    negate: function() {
        vec2.negate(this.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Normalize self
     * @return {clay.Vector2}
     */
    normalize: function() {
        vec2.normalize(this.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Generate random x, y components with a given scale
     * @param  {number} scale
     * @return {clay.Vector2}
     */
    random: function(scale) {
        vec2.random(this.array, scale);
        this._dirty = true;
        return this;
    },

    /**
     * Scale self
     * @param  {number}  scale
     * @return {clay.Vector2}
     */
    scale: function(s) {
        vec2.scale(this.array, this.array, s);
        this._dirty = true;
        return this;
    },

    /**
     * Scale b and add to self
     * @param  {clay.Vector2} b
     * @param  {number}  scale
     * @return {clay.Vector2}
     */
    scaleAndAdd: function(b, s) {
        vec2.scaleAndAdd(this.array, this.array, b.array, s);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for squaredDistance
     * @param  {clay.Vector2} b
     * @return {number}
     */
    sqrDist: function(b) {
        return vec2.sqrDist(this.array, b.array);
    },

    /**
     * Squared distance between self and b
     * @param  {clay.Vector2} b
     * @return {number}
     */
    squaredDistance: function(b) {
        return vec2.squaredDistance(this.array, b.array);
    },

    /**
     * Alias for squaredLength
     * @return {number}
     */
    sqrLen: function() {
        return vec2.sqrLen(this.array);
    },

    /**
     * Squared length of self
     * @return {number}
     */
    squaredLength: function() {
        return vec2.squaredLength(this.array);
    },

    /**
     * Alias for subtract
     * @param  {clay.Vector2} b
     * @return {clay.Vector2}
     */
    sub: function(b) {
        vec2.sub(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Subtract b from self
     * @param  {clay.Vector2} b
     * @return {clay.Vector2}
     */
    subtract: function(b) {
        vec2.subtract(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Transform self with a Matrix2 m
     * @param  {clay.Matrix2} m
     * @return {clay.Vector2}
     */
    transformMat2: function(m) {
        vec2.transformMat2(this.array, this.array, m.array);
        this._dirty = true;
        return this;
    },

    /**
     * Transform self with a Matrix2d m
     * @param  {clay.Matrix2d} m
     * @return {clay.Vector2}
     */
    transformMat2d: function(m) {
        vec2.transformMat2d(this.array, this.array, m.array);
        this._dirty = true;
        return this;
    },

    /**
     * Transform self with a Matrix3 m
     * @param  {clay.Matrix3} m
     * @return {clay.Vector2}
     */
    transformMat3: function(m) {
        vec2.transformMat3(this.array, this.array, m.array);
        this._dirty = true;
        return this;
    },

    /**
     * Transform self with a Matrix4 m
     * @param  {clay.Matrix4} m
     * @return {clay.Vector2}
     */
    transformMat4: function(m) {
        vec2.transformMat4(this.array, this.array, m.array);
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

// Getter and Setter
if (Object.defineProperty) {

    var proto = Vector2.prototype;
    /**
     * @name x
     * @type {number}
     * @memberOf clay.Vector2
     * @instance
     */
    Object.defineProperty(proto, 'x', {
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
     * @memberOf clay.Vector2
     * @instance
     */
    Object.defineProperty(proto, 'y', {
        get: function () {
            return this.array[1];
        },
        set: function (value) {
            this.array[1] = value;
            this._dirty = true;
        }
    });
}

// Supply methods that are not in place

/**
 * @param  {clay.Vector2} out
 * @param  {clay.Vector2} a
 * @param  {clay.Vector2} b
 * @return {clay.Vector2}
 */
Vector2.add = function(out, a, b) {
    vec2.add(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Vector2} out
 * @param  {number}  x
 * @param  {number}  y
 * @return {clay.Vector2}
 */
Vector2.set = function(out, x, y) {
    vec2.set(out.array, x, y);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Vector2} out
 * @param  {clay.Vector2} b
 * @return {clay.Vector2}
 */
Vector2.copy = function(out, b) {
    vec2.copy(out.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Vector3} out
 * @param  {clay.Vector2} a
 * @param  {clay.Vector2} b
 * @return {clay.Vector2}
 */
Vector2.cross = function(out, a, b) {
    vec2.cross(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};
/**
 * @param  {clay.Vector2} a
 * @param  {clay.Vector2} b
 * @return {number}
 */
Vector2.dist = function(a, b) {
    return vec2.distance(a.array, b.array);
};
/**
 * @function
 * @param  {clay.Vector2} a
 * @param  {clay.Vector2} b
 * @return {number}
 */
Vector2.distance = Vector2.dist;
/**
 * @param  {clay.Vector2} out
 * @param  {clay.Vector2} a
 * @param  {clay.Vector2} b
 * @return {clay.Vector2}
 */
Vector2.div = function(out, a, b) {
    vec2.divide(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};
/**
 * @function
 * @param  {clay.Vector2} out
 * @param  {clay.Vector2} a
 * @param  {clay.Vector2} b
 * @return {clay.Vector2}
 */
Vector2.divide = Vector2.div;
/**
 * @param  {clay.Vector2} a
 * @param  {clay.Vector2} b
 * @return {number}
 */
Vector2.dot = function(a, b) {
    return vec2.dot(a.array, b.array);
};

/**
 * @param  {clay.Vector2} a
 * @return {number}
 */
Vector2.len = function(b) {
    return vec2.length(b.array);
};

// Vector2.length = Vector2.len;

/**
 * @param  {clay.Vector2} out
 * @param  {clay.Vector2} a
 * @param  {clay.Vector2} b
 * @param  {number}  t
 * @return {clay.Vector2}
 */
Vector2.lerp = function(out, a, b, t) {
    vec2.lerp(out.array, a.array, b.array, t);
    out._dirty = true;
    return out;
};
/**
 * @param  {clay.Vector2} out
 * @param  {clay.Vector2} a
 * @param  {clay.Vector2} b
 * @return {clay.Vector2}
 */
Vector2.min = function(out, a, b) {
    vec2.min(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Vector2} out
 * @param  {clay.Vector2} a
 * @param  {clay.Vector2} b
 * @return {clay.Vector2}
 */
Vector2.max = function(out, a, b) {
    vec2.max(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};
/**
 * @param  {clay.Vector2} out
 * @param  {clay.Vector2} a
 * @param  {clay.Vector2} b
 * @return {clay.Vector2}
 */
Vector2.mul = function(out, a, b) {
    vec2.multiply(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};
/**
 * @function
 * @param  {clay.Vector2} out
 * @param  {clay.Vector2} a
 * @param  {clay.Vector2} b
 * @return {clay.Vector2}
 */
Vector2.multiply = Vector2.mul;
/**
 * @param  {clay.Vector2} out
 * @param  {clay.Vector2} a
 * @return {clay.Vector2}
 */
Vector2.negate = function(out, a) {
    vec2.negate(out.array, a.array);
    out._dirty = true;
    return out;
};
/**
 * @param  {clay.Vector2} out
 * @param  {clay.Vector2} a
 * @return {clay.Vector2}
 */
Vector2.normalize = function(out, a) {
    vec2.normalize(out.array, a.array);
    out._dirty = true;
    return out;
};
/**
 * @param  {clay.Vector2} out
 * @param  {number}  scale
 * @return {clay.Vector2}
 */
Vector2.random = function(out, scale) {
    vec2.random(out.array, scale);
    out._dirty = true;
    return out;
};
/**
 * @param  {clay.Vector2} out
 * @param  {clay.Vector2} a
 * @param  {number}  scale
 * @return {clay.Vector2}
 */
Vector2.scale = function(out, a, scale) {
    vec2.scale(out.array, a.array, scale);
    out._dirty = true;
    return out;
};
/**
 * @param  {clay.Vector2} out
 * @param  {clay.Vector2} a
 * @param  {clay.Vector2} b
 * @param  {number}  scale
 * @return {clay.Vector2}
 */
Vector2.scaleAndAdd = function(out, a, b, scale) {
    vec2.scaleAndAdd(out.array, a.array, b.array, scale);
    out._dirty = true;
    return out;
};
/**
 * @param  {clay.Vector2} a
 * @param  {clay.Vector2} b
 * @return {number}
 */
Vector2.sqrDist = function(a, b) {
    return vec2.sqrDist(a.array, b.array);
};
/**
 * @function
 * @param  {clay.Vector2} a
 * @param  {clay.Vector2} b
 * @return {number}
 */
Vector2.squaredDistance = Vector2.sqrDist;

/**
 * @param  {clay.Vector2} a
 * @return {number}
 */
Vector2.sqrLen = function(a) {
    return vec2.sqrLen(a.array);
};
/**
 * @function
 * @param  {clay.Vector2} a
 * @return {number}
 */
Vector2.squaredLength = Vector2.sqrLen;

/**
 * @param  {clay.Vector2} out
 * @param  {clay.Vector2} a
 * @param  {clay.Vector2} b
 * @return {clay.Vector2}
 */
Vector2.sub = function(out, a, b) {
    vec2.subtract(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};
/**
 * @function
 * @param  {clay.Vector2} out
 * @param  {clay.Vector2} a
 * @param  {clay.Vector2} b
 * @return {clay.Vector2}
 */
Vector2.subtract = Vector2.sub;
/**
 * @param  {clay.Vector2} out
 * @param  {clay.Vector2} a
 * @param  {clay.Matrix2} m
 * @return {clay.Vector2}
 */
Vector2.transformMat2 = function(out, a, m) {
    vec2.transformMat2(out.array, a.array, m.array);
    out._dirty = true;
    return out;
};
/**
 * @param  {clay.Vector2}  out
 * @param  {clay.Vector2}  a
 * @param  {clay.Matrix2d} m
 * @return {clay.Vector2}
 */
Vector2.transformMat2d = function(out, a, m) {
    vec2.transformMat2d(out.array, a.array, m.array);
    out._dirty = true;
    return out;
};
/**
 * @param  {clay.Vector2} out
 * @param  {clay.Vector2} a
 * @param  {Matrix3} m
 * @return {clay.Vector2}
 */
Vector2.transformMat3 = function(out, a, m) {
    vec2.transformMat3(out.array, a.array, m.array);
    out._dirty = true;
    return out;
};
/**
 * @param  {clay.Vector2} out
 * @param  {clay.Vector2} a
 * @param  {clay.Matrix4} m
 * @return {clay.Vector2}
 */
Vector2.transformMat4 = function(out, a, m) {
    vec2.transformMat4(out.array, a.array, m.array);
    out._dirty = true;
    return out;
};

export default Vector2;
