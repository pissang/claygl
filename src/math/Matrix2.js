import mat2 from '../glmatrix/mat2';

/**
 * @constructor
 * @alias clay.Matrix2
 */
var Matrix2 = function() {

    /**
     * Storage of Matrix2
     * @name array
     * @type {Float32Array}
     * @memberOf clay.Matrix2#
     */
    this.array = mat2.create();

    /**
     * @name _dirty
     * @type {boolean}
     * @memberOf clay.Matrix2#
     */
    this._dirty = true;
};

Matrix2.prototype = {

    constructor: Matrix2,

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
     * Clone a new Matrix2
     * @return {clay.Matrix2}
     */
    clone: function() {
        return (new Matrix2()).copy(this);
    },

    /**
     * Copy from b
     * @param  {clay.Matrix2} b
     * @return {clay.Matrix2}
     */
    copy: function(b) {
        mat2.copy(this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Calculate the adjugate of self, in-place
     * @return {clay.Matrix2}
     */
    adjoint: function() {
        mat2.adjoint(this.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Calculate matrix determinant
     * @return {number}
     */
    determinant: function() {
        return mat2.determinant(this.array);
    },

    /**
     * Set to a identity matrix
     * @return {clay.Matrix2}
     */
    identity: function() {
        mat2.identity(this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Invert self
     * @return {clay.Matrix2}
     */
    invert: function() {
        mat2.invert(this.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for mutiply
     * @param  {clay.Matrix2} b
     * @return {clay.Matrix2}
     */
    mul: function(b) {
        mat2.mul(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for multiplyLeft
     * @param  {clay.Matrix2} a
     * @return {clay.Matrix2}
     */
    mulLeft: function(a) {
        mat2.mul(this.array, a.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Multiply self and b
     * @param  {clay.Matrix2} b
     * @return {clay.Matrix2}
     */
    multiply: function(b) {
        mat2.multiply(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Multiply a and self, a is on the left
     * @param  {clay.Matrix2} a
     * @return {clay.Matrix2}
     */
    multiplyLeft: function(a) {
        mat2.multiply(this.array, a.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Rotate self by a given radian
     * @param  {number}   rad
     * @return {clay.Matrix2}
     */
    rotate: function(rad) {
        mat2.rotate(this.array, this.array, rad);
        this._dirty = true;
        return this;
    },

    /**
     * Scale self by s
     * @param  {clay.Vector2}  s
     * @return {clay.Matrix2}
     */
    scale: function(v) {
        mat2.scale(this.array, this.array, v.array);
        this._dirty = true;
        return this;
    },
    /**
     * Transpose self, in-place.
     * @return {clay.Matrix2}
     */
    transpose: function() {
        mat2.transpose(this.array, this.array);
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

/**
 * @param  {Matrix2} out
 * @param  {Matrix2} a
 * @return {Matrix2}
 */
Matrix2.adjoint = function(out, a) {
    mat2.adjoint(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix2} out
 * @param  {clay.Matrix2} a
 * @return {clay.Matrix2}
 */
Matrix2.copy = function(out, a) {
    mat2.copy(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix2} a
 * @return {number}
 */
Matrix2.determinant = function(a) {
    return mat2.determinant(a.array);
};

/**
 * @param  {clay.Matrix2} out
 * @return {clay.Matrix2}
 */
Matrix2.identity = function(out) {
    mat2.identity(out.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix2} out
 * @param  {clay.Matrix2} a
 * @return {clay.Matrix2}
 */
Matrix2.invert = function(out, a) {
    mat2.invert(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix2} out
 * @param  {clay.Matrix2} a
 * @param  {clay.Matrix2} b
 * @return {clay.Matrix2}
 */
Matrix2.mul = function(out, a, b) {
    mat2.mul(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @function
 * @param  {clay.Matrix2} out
 * @param  {clay.Matrix2} a
 * @param  {clay.Matrix2} b
 * @return {clay.Matrix2}
 */
Matrix2.multiply = Matrix2.mul;

/**
 * @param  {clay.Matrix2} out
 * @param  {clay.Matrix2} a
 * @param  {number}   rad
 * @return {clay.Matrix2}
 */
Matrix2.rotate = function(out, a, rad) {
    mat2.rotate(out.array, a.array, rad);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix2} out
 * @param  {clay.Matrix2} a
 * @param  {clay.Vector2}  v
 * @return {clay.Matrix2}
 */
Matrix2.scale = function(out, a, v) {
    mat2.scale(out.array, a.array, v.array);
    out._dirty = true;
    return out;
};
/**
 * @param  {Matrix2} out
 * @param  {Matrix2} a
 * @return {Matrix2}
 */
Matrix2.transpose = function(out, a) {
    mat2.transpose(out.array, a.array);
    out._dirty = true;
    return out;
};

export default Matrix2;
