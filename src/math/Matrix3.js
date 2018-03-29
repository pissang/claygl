import mat3 from '../glmatrix/mat3';

/**
 * @constructor
 * @alias clay.Matrix3
 */
var Matrix3 = function () {

    /**
     * Storage of Matrix3
     * @name array
     * @type {Float32Array}
     * @memberOf clay.Matrix3#
     */
    this.array = mat3.create();

    /**
     * @name _dirty
     * @type {boolean}
     * @memberOf clay.Matrix3#
     */
    this._dirty = true;
};

Matrix3.prototype = {

    constructor: Matrix3,

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
     * @return {clay.Matrix3}
     */
    adjoint: function () {
        mat3.adjoint(this.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Clone a new Matrix3
     * @return {clay.Matrix3}
     */
    clone: function () {
        return (new Matrix3()).copy(this);
    },

    /**
     * Copy from b
     * @param  {clay.Matrix3} b
     * @return {clay.Matrix3}
     */
    copy: function (b) {
        mat3.copy(this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Calculate matrix determinant
     * @return {number}
     */
    determinant: function () {
        return mat3.determinant(this.array);
    },

    /**
     * Copy the values from Matrix2d a
     * @param  {clay.Matrix2d} a
     * @return {clay.Matrix3}
     */
    fromMat2d: function (a) {
        mat3.fromMat2d(this.array, a.array);
        this._dirty = true;
        return this;
    },

    /**
     * Copies the upper-left 3x3 values of Matrix4
     * @param  {clay.Matrix4} a
     * @return {clay.Matrix3}
     */
    fromMat4: function (a) {
        mat3.fromMat4(this.array, a.array);
        this._dirty = true;
        return this;
    },

    /**
     * Calculates a rotation matrix from the given quaternion
     * @param  {clay.Quaternion} q
     * @return {clay.Matrix3}
     */
    fromQuat: function (q) {
        mat3.fromQuat(this.array, q.array);
        this._dirty = true;
        return this;
    },

    /**
     * Set to a identity matrix
     * @return {clay.Matrix3}
     */
    identity: function () {
        mat3.identity(this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Invert self
     * @return {clay.Matrix3}
     */
    invert: function () {
        mat3.invert(this.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for mutiply
     * @param  {clay.Matrix3} b
     * @return {clay.Matrix3}
     */
    mul: function (b) {
        mat3.mul(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for multiplyLeft
     * @param  {clay.Matrix3} a
     * @return {clay.Matrix3}
     */
    mulLeft: function (a) {
        mat3.mul(this.array, a.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Multiply self and b
     * @param  {clay.Matrix3} b
     * @return {clay.Matrix3}
     */
    multiply: function (b) {
        mat3.multiply(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Multiply a and self, a is on the left
     * @param  {clay.Matrix3} a
     * @return {clay.Matrix3}
     */
    multiplyLeft: function (a) {
        mat3.multiply(this.array, a.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Rotate self by a given radian
     * @param  {number}   rad
     * @return {clay.Matrix3}
     */
    rotate: function (rad) {
        mat3.rotate(this.array, this.array, rad);
        this._dirty = true;
        return this;
    },

    /**
     * Scale self by s
     * @param  {clay.Vector2}  s
     * @return {clay.Matrix3}
     */
    scale: function (v) {
        mat3.scale(this.array, this.array, v.array);
        this._dirty = true;
        return this;
    },

    /**
     * Translate self by v
     * @param  {clay.Vector2}  v
     * @return {clay.Matrix3}
     */
    translate: function (v) {
        mat3.translate(this.array, this.array, v.array);
        this._dirty = true;
        return this;
    },
    /**
     * Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
     * @param {clay.Matrix4} a
     */
    normalFromMat4: function (a) {
        mat3.normalFromMat4(this.array, a.array);
        this._dirty = true;
        return this;
    },

    /**
     * Transpose self, in-place.
     * @return {clay.Matrix2}
     */
    transpose: function () {
        mat3.transpose(this.array, this.array);
        this._dirty = true;
        return this;
    },

    toString: function () {
        return '[' + Array.prototype.join.call(this.array, ',') + ']';
    },

    toArray: function () {
        return Array.prototype.slice.call(this.array);
    }
};
/**
 * @param  {clay.Matrix3} out
 * @param  {clay.Matrix3} a
 * @return {clay.Matrix3}
 */
Matrix3.adjoint = function (out, a) {
    mat3.adjoint(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix3} out
 * @param  {clay.Matrix3} a
 * @return {clay.Matrix3}
 */
Matrix3.copy = function (out, a) {
    mat3.copy(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix3} a
 * @return {number}
 */
Matrix3.determinant = function (a) {
    return mat3.determinant(a.array);
};

/**
 * @param  {clay.Matrix3} out
 * @return {clay.Matrix3}
 */
Matrix3.identity = function (out) {
    mat3.identity(out.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix3} out
 * @param  {clay.Matrix3} a
 * @return {clay.Matrix3}
 */
Matrix3.invert = function (out, a) {
    mat3.invert(out.array, a.array);
    return out;
};

/**
 * @param  {clay.Matrix3} out
 * @param  {clay.Matrix3} a
 * @param  {clay.Matrix3} b
 * @return {clay.Matrix3}
 */
Matrix3.mul = function (out, a, b) {
    mat3.mul(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @function
 * @param  {clay.Matrix3} out
 * @param  {clay.Matrix3} a
 * @param  {clay.Matrix3} b
 * @return {clay.Matrix3}
 */
Matrix3.multiply = Matrix3.mul;

/**
 * @param  {clay.Matrix3}  out
 * @param  {clay.Matrix2d} a
 * @return {clay.Matrix3}
 */
Matrix3.fromMat2d = function (out, a) {
    mat3.fromMat2d(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix3} out
 * @param  {clay.Matrix4} a
 * @return {clay.Matrix3}
 */
Matrix3.fromMat4 = function (out, a) {
    mat3.fromMat4(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix3}    out
 * @param  {clay.Quaternion} a
 * @return {clay.Matrix3}
 */
Matrix3.fromQuat = function (out, q) {
    mat3.fromQuat(out.array, q.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix3} out
 * @param  {clay.Matrix4} a
 * @return {clay.Matrix3}
 */
Matrix3.normalFromMat4 = function (out, a) {
    mat3.normalFromMat4(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix3} out
 * @param  {clay.Matrix3} a
 * @param  {number}  rad
 * @return {clay.Matrix3}
 */
Matrix3.rotate = function (out, a, rad) {
    mat3.rotate(out.array, a.array, rad);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix3} out
 * @param  {clay.Matrix3} a
 * @param  {clay.Vector2} v
 * @return {clay.Matrix3}
 */
Matrix3.scale = function (out, a, v) {
    mat3.scale(out.array, a.array, v.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix3} out
 * @param  {clay.Matrix3} a
 * @return {clay.Matrix3}
 */
Matrix3.transpose = function (out, a) {
    mat3.transpose(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix3} out
 * @param  {clay.Matrix3} a
 * @param  {clay.Vector2} v
 * @return {clay.Matrix3}
 */
Matrix3.translate = function (out, a, v) {
    mat3.translate(out.array, a.array, v.array);
    out._dirty = true;
    return out;
};

export default Matrix3;
