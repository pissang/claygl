import glMatrix from '../dep/glmatrix';
var quat = glMatrix.quat;

/**
 * @constructor
 * @alias clay.math.Quaternion
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} w
 */
var Quaternion = function (x, y, z, w) {

    x = x || 0;
    y = y || 0;
    z = z || 0;
    w = w === undefined ? 1 : w;

    /**
     * Storage of Quaternion, read and write of x, y, z, w will change the values in array
     * All methods also operate on the array instead of x, y, z, w components
     * @name array
     * @type {Float32Array}
     * @memberOf clay.math.Quaternion#
     */
    this.array = quat.fromValues(x, y, z, w);

    /**
     * Dirty flag is used by the Node to determine
     * if the matrix is updated to latest
     * @name _dirty
     * @type {boolean}
     * @memberOf clay.math.Quaternion#
     */
    this._dirty = true;
};

Quaternion.prototype = {

    constructor: Quaternion,

    /**
     * Add b to self
     * @param  {clay.math.Quaternion} b
     * @return {clay.math.Quaternion}
     */
    add: function (b) {
        quat.add(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Calculate the w component from x, y, z component
     * @return {clay.math.Quaternion}
     */
    calculateW: function () {
        quat.calculateW(this.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Set x, y and z components
     * @param  {number}  x
     * @param  {number}  y
     * @param  {number}  z
     * @param  {number}  w
     * @return {clay.math.Quaternion}
     */
    set: function (x, y, z, w) {
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
     * @return {clay.math.Quaternion}
     */
    setArray: function (arr) {
        this.array[0] = arr[0];
        this.array[1] = arr[1];
        this.array[2] = arr[2];
        this.array[3] = arr[3];

        this._dirty = true;
        return this;
    },

    /**
     * Clone a new Quaternion
     * @return {clay.math.Quaternion}
     */
    clone: function () {
        return new Quaternion(this.x, this.y, this.z, this.w);
    },

    /**
     * Calculates the conjugate of self If the quaternion is normalized,
     * this function is faster than invert and produces the same result.
     *
     * @return {clay.math.Quaternion}
     */
    conjugate: function () {
        quat.conjugate(this.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Copy from b
     * @param  {clay.math.Quaternion} b
     * @return {clay.math.Quaternion}
     */
    copy: function (b) {
        quat.copy(this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Dot product of self and b
     * @param  {clay.math.Quaternion} b
     * @return {number}
     */
    dot: function (b) {
        return quat.dot(this.array, b.array);
    },

    /**
     * Set from the given 3x3 rotation matrix
     * @param  {clay.math.Matrix3} m
     * @return {clay.math.Quaternion}
     */
    fromMat3: function (m) {
        quat.fromMat3(this.array, m.array);
        this._dirty = true;
        return this;
    },

    /**
     * Set from the given 4x4 rotation matrix
     * The 4th column and 4th row will be droped
     * @param  {clay.math.Matrix4} m
     * @return {clay.math.Quaternion}
     */
    fromMat4: (function () {
        var mat3 = glMatrix.mat3;
        var m3 = mat3.create();
        return function (m) {
            mat3.fromMat4(m3, m.array);
            // TODO Not like mat4, mat3 in glmatrix seems to be row-based
            mat3.transpose(m3, m3);
            quat.fromMat3(this.array, m3);
            this._dirty = true;
            return this;
        };
    })(),

    /**
     * Set to identity quaternion
     * @return {clay.math.Quaternion}
     */
    identity: function () {
        quat.identity(this.array);
        this._dirty = true;
        return this;
    },
    /**
     * Invert self
     * @return {clay.math.Quaternion}
     */
    invert: function () {
        quat.invert(this.array, this.array);
        this._dirty = true;
        return this;
    },
    /**
     * Alias of length
     * @return {number}
     */
    len: function () {
        return quat.len(this.array);
    },

    /**
     * Calculate the length
     * @return {number}
     */
    length: function () {
        return quat.length(this.array);
    },

    /**
     * Linear interpolation between a and b
     * @param  {clay.math.Quaternion} a
     * @param  {clay.math.Quaternion} b
     * @param  {number}  t
     * @return {clay.math.Quaternion}
     */
    lerp: function (a, b, t) {
        quat.lerp(this.array, a.array, b.array, t);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for multiply
     * @param  {clay.math.Quaternion} b
     * @return {clay.math.Quaternion}
     */
    mul: function (b) {
        quat.mul(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for multiplyLeft
     * @param  {clay.math.Quaternion} a
     * @return {clay.math.Quaternion}
     */
    mulLeft: function (a) {
        quat.multiply(this.array, a.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Mutiply self and b
     * @param  {clay.math.Quaternion} b
     * @return {clay.math.Quaternion}
     */
    multiply: function (b) {
        quat.multiply(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Mutiply a and self
     * Quaternion mutiply is not commutative, so the result of mutiplyLeft is different with multiply.
     * @param  {clay.math.Quaternion} a
     * @return {clay.math.Quaternion}
     */
    multiplyLeft: function (a) {
        quat.multiply(this.array, a.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Normalize self
     * @return {clay.math.Quaternion}
     */
    normalize: function () {
        quat.normalize(this.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Rotate self by a given radian about X axis
     * @param {number} rad
     * @return {clay.math.Quaternion}
     */
    rotateX: function (rad) {
        quat.rotateX(this.array, this.array, rad);
        this._dirty = true;
        return this;
    },

    /**
     * Rotate self by a given radian about Y axis
     * @param {number} rad
     * @return {clay.math.Quaternion}
     */
    rotateY: function (rad) {
        quat.rotateY(this.array, this.array, rad);
        this._dirty = true;
        return this;
    },

    /**
     * Rotate self by a given radian about Z axis
     * @param {number} rad
     * @return {clay.math.Quaternion}
     */
    rotateZ: function (rad) {
        quat.rotateZ(this.array, this.array, rad);
        this._dirty = true;
        return this;
    },

    /**
     * Sets self to represent the shortest rotation from Vector3 a to Vector3 b.
     * a and b needs to be normalized
     * @param  {clay.math.Vector3} a
     * @param  {clay.math.Vector3} b
     * @return {clay.math.Quaternion}
     */
    rotationTo: function (a, b) {
        quat.rotationTo(this.array, a.array, b.array);
        this._dirty = true;
        return this;
    },
    /**
     * Sets self with values corresponding to the given axes
     * @param {clay.math.Vector3} view
     * @param {clay.math.Vector3} right
     * @param {clay.math.Vector3} up
     * @return {clay.math.Quaternion}
     */
    setAxes: function (view, right, up) {
        quat.setAxes(this.array, view.array, right.array, up.array);
        this._dirty = true;
        return this;
    },

    /**
     * Sets self with a rotation axis and rotation angle
     * @param {clay.math.Vector3} axis
     * @param {number} rad
     * @return {clay.math.Quaternion}
     */
    setAxisAngle: function (axis, rad) {
        quat.setAxisAngle(this.array, axis.array, rad);
        this._dirty = true;
        return this;
    },
    /**
     * Perform spherical linear interpolation between a and b
     * @param  {clay.math.Quaternion} a
     * @param  {clay.math.Quaternion} b
     * @param  {number} t
     * @return {clay.math.Quaternion}
     */
    slerp: function (a, b, t) {
        quat.slerp(this.array, a.array, b.array, t);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for squaredLength
     * @return {number}
     */
    sqrLen: function () {
        return quat.sqrLen(this.array);
    },

    /**
     * Squared length of self
     * @return {number}
     */
    squaredLength: function () {
        return quat.squaredLength(this.array);
    },

    /**
     * Set from euler
     * @param {clay.math.Vector3} v
     * @param {String} order
     */
    fromEuler: function (v, order) {
        return Quaternion.fromEuler(this, v, order);
    },

    toString: function () {
        return '[' + Array.prototype.join.call(this.array, ',') + ']';
    },

    toArray: function () {
        return Array.prototype.slice.call(this.array);
    }
};

var defineProperty = Object.defineProperty;
// Getter and Setter
if (defineProperty) {

    var proto = Quaternion.prototype;
    /**
     * @name x
     * @type {number}
     * @memberOf clay.math.Quaternion
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
     * @memberOf clay.math.Quaternion
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
     * @memberOf clay.math.Quaternion
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
     * @memberOf clay.math.Quaternion
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
 * @param  {clay.math.Quaternion} out
 * @param  {clay.math.Quaternion} a
 * @param  {clay.math.Quaternion} b
 * @return {clay.math.Quaternion}
 */
Quaternion.add = function (out, a, b) {
    quat.add(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.math.Quaternion} out
 * @param  {number}     x
 * @param  {number}     y
 * @param  {number}     z
 * @param  {number}     w
 * @return {clay.math.Quaternion}
 */
Quaternion.set = function (out, x, y, z, w) {
    quat.set(out.array, x, y, z, w);
    out._dirty = true;
};

/**
 * @param  {clay.math.Quaternion} out
 * @param  {clay.math.Quaternion} b
 * @return {clay.math.Quaternion}
 */
Quaternion.copy = function (out, b) {
    quat.copy(out.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.math.Quaternion} out
 * @param  {clay.math.Quaternion} a
 * @return {clay.math.Quaternion}
 */
Quaternion.calculateW = function (out, a) {
    quat.calculateW(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.math.Quaternion} out
 * @param  {clay.math.Quaternion} a
 * @return {clay.math.Quaternion}
 */
Quaternion.conjugate = function (out, a) {
    quat.conjugate(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.math.Quaternion} out
 * @return {clay.math.Quaternion}
 */
Quaternion.identity = function (out) {
    quat.identity(out.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.math.Quaternion} out
 * @param  {clay.math.Quaternion} a
 * @return {clay.math.Quaternion}
 */
Quaternion.invert = function (out, a) {
    quat.invert(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.math.Quaternion} a
 * @param  {clay.math.Quaternion} b
 * @return {number}
 */
Quaternion.dot = function (a, b) {
    return quat.dot(a.array, b.array);
};

/**
 * @param  {clay.math.Quaternion} a
 * @return {number}
 */
Quaternion.len = function (a) {
    return quat.length(a.array);
};

// Quaternion.length = Quaternion.len;

/**
 * @param  {clay.math.Quaternion} out
 * @param  {clay.math.Quaternion} a
 * @param  {clay.math.Quaternion} b
 * @param  {number}     t
 * @return {clay.math.Quaternion}
 */
Quaternion.lerp = function (out, a, b, t) {
    quat.lerp(out.array, a.array, b.array, t);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.math.Quaternion} out
 * @param  {clay.math.Quaternion} a
 * @param  {clay.math.Quaternion} b
 * @param  {number}     t
 * @return {clay.math.Quaternion}
 */
Quaternion.slerp = function (out, a, b, t) {
    quat.slerp(out.array, a.array, b.array, t);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.math.Quaternion} out
 * @param  {clay.math.Quaternion} a
 * @param  {clay.math.Quaternion} b
 * @return {clay.math.Quaternion}
 */
Quaternion.mul = function (out, a, b) {
    quat.multiply(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @function
 * @param  {clay.math.Quaternion} out
 * @param  {clay.math.Quaternion} a
 * @param  {clay.math.Quaternion} b
 * @return {clay.math.Quaternion}
 */
Quaternion.multiply = Quaternion.mul;

/**
 * @param  {clay.math.Quaternion} out
 * @param  {clay.math.Quaternion} a
 * @param  {number}     rad
 * @return {clay.math.Quaternion}
 */
Quaternion.rotateX = function (out, a, rad) {
    quat.rotateX(out.array, a.array, rad);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.math.Quaternion} out
 * @param  {clay.math.Quaternion} a
 * @param  {number}     rad
 * @return {clay.math.Quaternion}
 */
Quaternion.rotateY = function (out, a, rad) {
    quat.rotateY(out.array, a.array, rad);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.math.Quaternion} out
 * @param  {clay.math.Quaternion} a
 * @param  {number}     rad
 * @return {clay.math.Quaternion}
 */
Quaternion.rotateZ = function (out, a, rad) {
    quat.rotateZ(out.array, a.array, rad);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.math.Quaternion} out
 * @param  {clay.math.Vector3}    axis
 * @param  {number}     rad
 * @return {clay.math.Quaternion}
 */
Quaternion.setAxisAngle = function (out, axis, rad) {
    quat.setAxisAngle(out.array, axis.array, rad);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.math.Quaternion} out
 * @param  {clay.math.Quaternion} a
 * @return {clay.math.Quaternion}
 */
Quaternion.normalize = function (out, a) {
    quat.normalize(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.math.Quaternion} a
 * @return {number}
 */
Quaternion.sqrLen = function (a) {
    return quat.sqrLen(a.array);
};

/**
 * @function
 * @param  {clay.math.Quaternion} a
 * @return {number}
 */
Quaternion.squaredLength = Quaternion.sqrLen;

/**
 * @param  {clay.math.Quaternion} out
 * @param  {clay.math.Matrix3}    m
 * @return {clay.math.Quaternion}
 */
Quaternion.fromMat3 = function (out, m) {
    quat.fromMat3(out.array, m.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.math.Quaternion} out
 * @param  {clay.math.Vector3}    view
 * @param  {clay.math.Vector3}    right
 * @param  {clay.math.Vector3}    up
 * @return {clay.math.Quaternion}
 */
Quaternion.setAxes = function (out, view, right, up) {
    quat.setAxes(out.array, view.array, right.array, up.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.math.Quaternion} out
 * @param  {clay.math.Vector3}    a
 * @param  {clay.math.Vector3}    b
 * @return {clay.math.Quaternion}
 */
Quaternion.rotationTo = function (out, a, b) {
    quat.rotationTo(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * Set quaternion from euler
 * @param {clay.math.Quaternion} out
 * @param {clay.math.Vector3} v
 * @param {String} order
 */
Quaternion.fromEuler = function (out, v, order) {

    out._dirty = true;

    v = v.array;
    var target = out.array;
    var c1 = Math.cos(v[0] / 2);
    var c2 = Math.cos(v[1] / 2);
    var c3 = Math.cos(v[2] / 2);
    var s1 = Math.sin(v[0] / 2);
    var s2 = Math.sin(v[1] / 2);
    var s3 = Math.sin(v[2] / 2);

    var order = (order || 'XYZ').toUpperCase();

    // http://www.mathworks.com/matlabcentral/fileexchange/
    //  20696-function-to-convert-between-dcm-euler-angles-quaternions-and-euler-vectors/
    //  content/SpinCalc.m

    switch (order) {
        case 'XYZ':
            target[0] = s1 * c2 * c3 + c1 * s2 * s3;
            target[1] = c1 * s2 * c3 - s1 * c2 * s3;
            target[2] = c1 * c2 * s3 + s1 * s2 * c3;
            target[3] = c1 * c2 * c3 - s1 * s2 * s3;
            break;
        case 'YXZ':
            target[0] = s1 * c2 * c3 + c1 * s2 * s3;
            target[1] = c1 * s2 * c3 - s1 * c2 * s3;
            target[2] = c1 * c2 * s3 - s1 * s2 * c3;
            target[3] = c1 * c2 * c3 + s1 * s2 * s3;
            break;
        case 'ZXY':
            target[0] = s1 * c2 * c3 - c1 * s2 * s3;
            target[1] = c1 * s2 * c3 + s1 * c2 * s3;
            target[2] = c1 * c2 * s3 + s1 * s2 * c3;
            target[3] = c1 * c2 * c3 - s1 * s2 * s3;
            break;
        case 'ZYX':
            target[0] = s1 * c2 * c3 - c1 * s2 * s3;
            target[1] = c1 * s2 * c3 + s1 * c2 * s3;
            target[2] = c1 * c2 * s3 - s1 * s2 * c3;
            target[3] = c1 * c2 * c3 + s1 * s2 * s3;
            break;
        case 'YZX':
            target[0] = s1 * c2 * c3 + c1 * s2 * s3;
            target[1] = c1 * s2 * c3 + s1 * c2 * s3;
            target[2] = c1 * c2 * s3 - s1 * s2 * c3;
            target[3] = c1 * c2 * c3 - s1 * s2 * s3;
            break;
        case 'XZY':
            target[0] = s1 * c2 * c3 - c1 * s2 * s3;
            target[1] = c1 * s2 * c3 - s1 * c2 * s3;
            target[2] = c1 * c2 * s3 + s1 * s2 * c3;
            target[3] = c1 * c2 * c3 + s1 * s2 * s3;
            break;
    }
};

export default Quaternion;
