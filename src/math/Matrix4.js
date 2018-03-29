import mat4 from '../glmatrix/mat4';
import vec3 from '../glmatrix/vec3';
import quat from '../glmatrix/quat';
import mat3 from '../glmatrix/mat3';
import Vector3 from './Vector3';

/**
 * @constructor
 * @alias clay.Matrix4
 */
var Matrix4 = function() {

    this._axisX = new Vector3();
    this._axisY = new Vector3();
    this._axisZ = new Vector3();

    /**
     * Storage of Matrix4
     * @name array
     * @type {Float32Array}
     * @memberOf clay.Matrix4#
     */
    this.array = mat4.create();

    /**
     * @name _dirty
     * @type {boolean}
     * @memberOf clay.Matrix4#
     */
    this._dirty = true;
};

Matrix4.prototype = {

    constructor: Matrix4,

    /**
     * Set components from array
     * @param  {Float32Array|number[]} arr
     */
    setArray: function (arr) {
        for (var i = 0; i < this.array.length; i++) {
            this.array[i] = arr[i];
        }
        this._dirty = true;
        return this;
    },
    /**
     * Calculate the adjugate of self, in-place
     * @return {clay.Matrix4}
     */
    adjoint: function() {
        mat4.adjoint(this.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Clone a new Matrix4
     * @return {clay.Matrix4}
     */
    clone: function() {
        return (new Matrix4()).copy(this);
    },

    /**
     * Copy from b
     * @param  {clay.Matrix4} b
     * @return {clay.Matrix4}
     */
    copy: function(a) {
        mat4.copy(this.array, a.array);
        this._dirty = true;
        return this;
    },

    /**
     * Calculate matrix determinant
     * @return {number}
     */
    determinant: function() {
        return mat4.determinant(this.array);
    },

    /**
     * Set upper 3x3 part from quaternion
     * @param  {clay.Quaternion} q
     * @return {clay.Matrix4}
     */
    fromQuat: function(q) {
        mat4.fromQuat(this.array, q.array);
        this._dirty = true;
        return this;
    },

    /**
     * Set from a quaternion rotation and a vector translation
     * @param  {clay.Quaternion} q
     * @param  {clay.Vector3} v
     * @return {clay.Matrix4}
     */
    fromRotationTranslation: function(q, v) {
        mat4.fromRotationTranslation(this.array, q.array, v.array);
        this._dirty = true;
        return this;
    },

    /**
     * Set from Matrix2d, it is used when converting a 2d shape to 3d space.
     * In 3d space it is equivalent to ranslate on xy plane and rotate about z axis
     * @param  {clay.Matrix2d} m2d
     * @return {clay.Matrix4}
     */
    fromMat2d: function(m2d) {
        Matrix4.fromMat2d(this, m2d);
        return this;
    },

    /**
     * Set from frustum bounds
     * @param  {number} left
     * @param  {number} right
     * @param  {number} bottom
     * @param  {number} top
     * @param  {number} near
     * @param  {number} far
     * @return {clay.Matrix4}
     */
    frustum: function (left, right, bottom, top, near, far) {
        mat4.frustum(this.array, left, right, bottom, top, near, far);
        this._dirty = true;
        return this;
    },

    /**
     * Set to a identity matrix
     * @return {clay.Matrix4}
     */
    identity: function() {
        mat4.identity(this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Invert self
     * @return {clay.Matrix4}
     */
    invert: function() {
        mat4.invert(this.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Set as a matrix with the given eye position, focal point, and up axis
     * @param  {clay.Vector3} eye
     * @param  {clay.Vector3} center
     * @param  {clay.Vector3} up
     * @return {clay.Matrix4}
     */
    lookAt: function(eye, center, up) {
        mat4.lookAt(this.array, eye.array, center.array, up.array);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for mutiply
     * @param  {clay.Matrix4} b
     * @return {clay.Matrix4}
     */
    mul: function(b) {
        mat4.mul(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for multiplyLeft
     * @param  {clay.Matrix4} a
     * @return {clay.Matrix4}
     */
    mulLeft: function(a) {
        mat4.mul(this.array, a.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Multiply self and b
     * @param  {clay.Matrix4} b
     * @return {clay.Matrix4}
     */
    multiply: function(b) {
        mat4.multiply(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Multiply a and self, a is on the left
     * @param  {clay.Matrix3} a
     * @return {clay.Matrix3}
     */
    multiplyLeft: function(a) {
        mat4.multiply(this.array, a.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Set as a orthographic projection matrix
     * @param  {number} left
     * @param  {number} right
     * @param  {number} bottom
     * @param  {number} top
     * @param  {number} near
     * @param  {number} far
     * @return {clay.Matrix4}
     */
    ortho: function(left, right, bottom, top, near, far) {
        mat4.ortho(this.array, left, right, bottom, top, near, far);
        this._dirty = true;
        return this;
    },
    /**
     * Set as a perspective projection matrix
     * @param  {number} fovy
     * @param  {number} aspect
     * @param  {number} near
     * @param  {number} far
     * @return {clay.Matrix4}
     */
    perspective: function(fovy, aspect, near, far) {
        mat4.perspective(this.array, fovy, aspect, near, far);
        this._dirty = true;
        return this;
    },

    /**
     * Rotate self by rad about axis.
     * Equal to right-multiply a rotaion matrix
     * @param  {number}   rad
     * @param  {clay.Vector3} axis
     * @return {clay.Matrix4}
     */
    rotate: function(rad, axis) {
        mat4.rotate(this.array, this.array, rad, axis.array);
        this._dirty = true;
        return this;
    },

    /**
     * Rotate self by a given radian about X axis.
     * Equal to right-multiply a rotaion matrix
     * @param {number} rad
     * @return {clay.Matrix4}
     */
    rotateX: function(rad) {
        mat4.rotateX(this.array, this.array, rad);
        this._dirty = true;
        return this;
    },

    /**
     * Rotate self by a given radian about Y axis.
     * Equal to right-multiply a rotaion matrix
     * @param {number} rad
     * @return {clay.Matrix4}
     */
    rotateY: function(rad) {
        mat4.rotateY(this.array, this.array, rad);
        this._dirty = true;
        return this;
    },

    /**
     * Rotate self by a given radian about Z axis.
     * Equal to right-multiply a rotaion matrix
     * @param {number} rad
     * @return {clay.Matrix4}
     */
    rotateZ: function(rad) {
        mat4.rotateZ(this.array, this.array, rad);
        this._dirty = true;
        return this;
    },

    /**
     * Scale self by s
     * Equal to right-multiply a scale matrix
     * @param  {clay.Vector3}  s
     * @return {clay.Matrix4}
     */
    scale: function(v) {
        mat4.scale(this.array, this.array, v.array);
        this._dirty = true;
        return this;
    },

    /**
     * Translate self by v.
     * Equal to right-multiply a translate matrix
     * @param  {clay.Vector3}  v
     * @return {clay.Matrix4}
     */
    translate: function(v) {
        mat4.translate(this.array, this.array, v.array);
        this._dirty = true;
        return this;
    },

    /**
     * Transpose self, in-place.
     * @return {clay.Matrix2}
     */
    transpose: function() {
        mat4.transpose(this.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Decompose a matrix to SRT
     * @param {clay.Vector3} [scale]
     * @param {clay.Quaternion} rotation
     * @param {clay.Vector} position
     * @see http://msdn.microsoft.com/en-us/library/microsoft.xna.framework.matrix.decompose.aspx
     */
    decomposeMatrix: (function() {

        var x = vec3.create();
        var y = vec3.create();
        var z = vec3.create();

        var m3 = mat3.create();

        return function(scale, rotation, position) {

            var el = this.array;
            vec3.set(x, el[0], el[1], el[2]);
            vec3.set(y, el[4], el[5], el[6]);
            vec3.set(z, el[8], el[9], el[10]);

            var sx = vec3.length(x);
            var sy = vec3.length(y);
            var sz = vec3.length(z);

            // if determine is negative, we need to invert one scale
            var det = this.determinant();
            if (det < 0) {
                sx = -sx;
            }

            if (scale) {
                scale.set(sx, sy, sz);
            }

            position.set(el[12], el[13], el[14]);

            mat3.fromMat4(m3, el);
            // Not like mat4, mat3 in glmatrix seems to be row-based
            // Seems fixed in gl-matrix 2.2.2
            // https://github.com/toji/gl-matrix/issues/114
            // mat3.transpose(m3, m3);

            m3[0] /= sx;
            m3[1] /= sx;
            m3[2] /= sx;

            m3[3] /= sy;
            m3[4] /= sy;
            m3[5] /= sy;

            m3[6] /= sz;
            m3[7] /= sz;
            m3[8] /= sz;

            quat.fromMat3(rotation.array, m3);
            quat.normalize(rotation.array, rotation.array);

            rotation._dirty = true;
            position._dirty = true;
        };
    })(),

    toString: function() {
        return '[' + Array.prototype.join.call(this.array, ',') + ']';
    },

    toArray: function () {
        return Array.prototype.slice.call(this.array);
    }
};

var defineProperty = Object.defineProperty;

if (defineProperty) {
    var proto = Matrix4.prototype;
    /**
     * Z Axis of local transform
     * @name z
     * @type {clay.Vector3}
     * @memberOf clay.Matrix4
     * @instance
     */
    defineProperty(proto, 'z', {
        get: function () {
            var el = this.array;
            this._axisZ.set(el[8], el[9], el[10]);
            return this._axisZ;
        },
        set: function (v) {
            // TODO Here has a problem
            // If only set an item of vector will not work
            var el = this.array;
            v = v.array;
            el[8] = v[0];
            el[9] = v[1];
            el[10] = v[2];

            this._dirty = true;
        }
    });

    /**
     * Y Axis of local transform
     * @name y
     * @type {clay.Vector3}
     * @memberOf clay.Matrix4
     * @instance
     */
    defineProperty(proto, 'y', {
        get: function () {
            var el = this.array;
            this._axisY.set(el[4], el[5], el[6]);
            return this._axisY;
        },
        set: function (v) {
            var el = this.array;
            v = v.array;
            el[4] = v[0];
            el[5] = v[1];
            el[6] = v[2];

            this._dirty = true;
        }
    });

    /**
     * X Axis of local transform
     * @name x
     * @type {clay.Vector3}
     * @memberOf clay.Matrix4
     * @instance
     */
    defineProperty(proto, 'x', {
        get: function () {
            var el = this.array;
            this._axisX.set(el[0], el[1], el[2]);
            return this._axisX;
        },
        set: function (v) {
            var el = this.array;
            v = v.array;
            el[0] = v[0];
            el[1] = v[1];
            el[2] = v[2];

            this._dirty = true;
        }
    })
}

/**
 * @param  {clay.Matrix4} out
 * @param  {clay.Matrix4} a
 * @return {clay.Matrix4}
 */
Matrix4.adjoint = function(out, a) {
    mat4.adjoint(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix4} out
 * @param  {clay.Matrix4} a
 * @return {clay.Matrix4}
 */
Matrix4.copy = function(out, a) {
    mat4.copy(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix4} a
 * @return {number}
 */
Matrix4.determinant = function(a) {
    return mat4.determinant(a.array);
};

/**
 * @param  {clay.Matrix4} out
 * @return {clay.Matrix4}
 */
Matrix4.identity = function(out) {
    mat4.identity(out.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix4} out
 * @param  {number}  left
 * @param  {number}  right
 * @param  {number}  bottom
 * @param  {number}  top
 * @param  {number}  near
 * @param  {number}  far
 * @return {clay.Matrix4}
 */
Matrix4.ortho = function(out, left, right, bottom, top, near, far) {
    mat4.ortho(out.array, left, right, bottom, top, near, far);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix4} out
 * @param  {number}  fovy
 * @param  {number}  aspect
 * @param  {number}  near
 * @param  {number}  far
 * @return {clay.Matrix4}
 */
Matrix4.perspective = function(out, fovy, aspect, near, far) {
    mat4.perspective(out.array, fovy, aspect, near, far);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix4} out
 * @param  {clay.Vector3} eye
 * @param  {clay.Vector3} center
 * @param  {clay.Vector3} up
 * @return {clay.Matrix4}
 */
Matrix4.lookAt = function(out, eye, center, up) {
    mat4.lookAt(out.array, eye.array, center.array, up.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix4} out
 * @param  {clay.Matrix4} a
 * @return {clay.Matrix4}
 */
Matrix4.invert = function(out, a) {
    mat4.invert(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix4} out
 * @param  {clay.Matrix4} a
 * @param  {clay.Matrix4} b
 * @return {clay.Matrix4}
 */
Matrix4.mul = function(out, a, b) {
    mat4.mul(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @function
 * @param  {clay.Matrix4} out
 * @param  {clay.Matrix4} a
 * @param  {clay.Matrix4} b
 * @return {clay.Matrix4}
 */
Matrix4.multiply = Matrix4.mul;

/**
 * @param  {clay.Matrix4}    out
 * @param  {clay.Quaternion} q
 * @return {clay.Matrix4}
 */
Matrix4.fromQuat = function(out, q) {
    mat4.fromQuat(out.array, q.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix4}    out
 * @param  {clay.Quaternion} q
 * @param  {clay.Vector3}    v
 * @return {clay.Matrix4}
 */
Matrix4.fromRotationTranslation = function(out, q, v) {
    mat4.fromRotationTranslation(out.array, q.array, v.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix4} m4
 * @param  {clay.Matrix2d} m2d
 * @return {clay.Matrix4}
 */
Matrix4.fromMat2d = function(m4, m2d) {
    m4._dirty = true;
    var m2d = m2d.array;
    var m4 = m4.array;

    m4[0] = m2d[0];
    m4[4] = m2d[2];
    m4[12] = m2d[4];

    m4[1] = m2d[1];
    m4[5] = m2d[3];
    m4[13] = m2d[5];

    return m4;
};

/**
 * @param  {clay.Matrix4} out
 * @param  {clay.Matrix4} a
 * @param  {number}  rad
 * @param  {clay.Vector3} axis
 * @return {clay.Matrix4}
 */
Matrix4.rotate = function(out, a, rad, axis) {
    mat4.rotate(out.array, a.array, rad, axis.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix4} out
 * @param  {clay.Matrix4} a
 * @param  {number}  rad
 * @return {clay.Matrix4}
 */
Matrix4.rotateX = function(out, a, rad) {
    mat4.rotateX(out.array, a.array, rad);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix4} out
 * @param  {clay.Matrix4} a
 * @param  {number}  rad
 * @return {clay.Matrix4}
 */
Matrix4.rotateY = function(out, a, rad) {
    mat4.rotateY(out.array, a.array, rad);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix4} out
 * @param  {clay.Matrix4} a
 * @param  {number}  rad
 * @return {clay.Matrix4}
 */
Matrix4.rotateZ = function(out, a, rad) {
    mat4.rotateZ(out.array, a.array, rad);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix4} out
 * @param  {clay.Matrix4} a
 * @param  {clay.Vector3} v
 * @return {clay.Matrix4}
 */
Matrix4.scale = function(out, a, v) {
    mat4.scale(out.array, a.array, v.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix4} out
 * @param  {clay.Matrix4} a
 * @return {clay.Matrix4}
 */
Matrix4.transpose = function(out, a) {
    mat4.transpose(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix4} out
 * @param  {clay.Matrix4} a
 * @param  {clay.Vector3} v
 * @return {clay.Matrix4}
 */
Matrix4.translate = function(out, a, v) {
    mat4.translate(out.array, a.array, v.array);
    out._dirty = true;
    return out;
};

export default Matrix4;
