import mat2d from '../glmatrix/mat2d';

/**
 * @constructor
 * @alias clay.Matrix2d
 */
var Matrix2d = function() {
    /**
     * Storage of Matrix2d
     * @name array
     * @type {Float32Array}
     * @memberOf clay.Matrix2d#
     */
    this.array = mat2d.create();

    /**
     * @name _dirty
     * @type {boolean}
     * @memberOf clay.Matrix2d#
     */
    this._dirty = true;
};

Matrix2d.prototype = {

    constructor: Matrix2d,

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
     * Clone a new Matrix2d
     * @return {clay.Matrix2d}
     */
    clone: function() {
        return (new Matrix2d()).copy(this);
    },

    /**
     * Copy from b
     * @param  {clay.Matrix2d} b
     * @return {clay.Matrix2d}
     */
    copy: function(b) {
        mat2d.copy(this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Calculate matrix determinant
     * @return {number}
     */
    determinant: function() {
        return mat2d.determinant(this.array);
    },

    /**
     * Set to a identity matrix
     * @return {clay.Matrix2d}
     */
    identity: function() {
        mat2d.identity(this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Invert self
     * @return {clay.Matrix2d}
     */
    invert: function() {
        mat2d.invert(this.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for mutiply
     * @param  {clay.Matrix2d} b
     * @return {clay.Matrix2d}
     */
    mul: function(b) {
        mat2d.mul(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for multiplyLeft
     * @param  {clay.Matrix2d} a
     * @return {clay.Matrix2d}
     */
    mulLeft: function(b) {
        mat2d.mul(this.array, b.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Multiply self and b
     * @param  {clay.Matrix2d} b
     * @return {clay.Matrix2d}
     */
    multiply: function(b) {
        mat2d.multiply(this.array, this.array, b.array);
        this._dirty = true;
        return this;
    },

    /**
     * Multiply a and self, a is on the left
     * @param  {clay.Matrix2d} a
     * @return {clay.Matrix2d}
     */
    multiplyLeft: function(b) {
        mat2d.multiply(this.array, b.array, this.array);
        this._dirty = true;
        return this;
    },

    /**
     * Rotate self by a given radian
     * @param  {number}   rad
     * @return {clay.Matrix2d}
     */
    rotate: function(rad) {
        mat2d.rotate(this.array, this.array, rad);
        this._dirty = true;
        return this;
    },

    /**
     * Scale self by s
     * @param  {clay.Vector2}  s
     * @return {clay.Matrix2d}
     */
    scale: function(s) {
        mat2d.scale(this.array, this.array, s.array);
        this._dirty = true;
        return this;
    },

    /**
     * Translate self by v
     * @param  {clay.Vector2}  v
     * @return {clay.Matrix2d}
     */
    translate: function(v) {
        mat2d.translate(this.array, this.array, v.array);
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
 * @param  {clay.Matrix2d} out
 * @param  {clay.Matrix2d} a
 * @return {clay.Matrix2d}
 */
Matrix2d.copy = function(out, a) {
    mat2d.copy(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix2d} a
 * @return {number}
 */
Matrix2d.determinant = function(a) {
    return mat2d.determinant(a.array);
};

/**
 * @param  {clay.Matrix2d} out
 * @return {clay.Matrix2d}
 */
Matrix2d.identity = function(out) {
    mat2d.identity(out.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix2d} out
 * @param  {clay.Matrix2d} a
 * @return {clay.Matrix2d}
 */
Matrix2d.invert = function(out, a) {
    mat2d.invert(out.array, a.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix2d} out
 * @param  {clay.Matrix2d} a
 * @param  {clay.Matrix2d} b
 * @return {clay.Matrix2d}
 */
Matrix2d.mul = function(out, a, b) {
    mat2d.mul(out.array, a.array, b.array);
    out._dirty = true;
    return out;
};

/**
 * @function
 * @param  {clay.Matrix2d} out
 * @param  {clay.Matrix2d} a
 * @param  {clay.Matrix2d} b
 * @return {clay.Matrix2d}
 */
Matrix2d.multiply = Matrix2d.mul;

/**
 * @param  {clay.Matrix2d} out
 * @param  {clay.Matrix2d} a
 * @param  {number}   rad
 * @return {clay.Matrix2d}
 */
Matrix2d.rotate = function(out, a, rad) {
    mat2d.rotate(out.array, a.array, rad);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix2d} out
 * @param  {clay.Matrix2d} a
 * @param  {clay.Vector2}  v
 * @return {clay.Matrix2d}
 */
Matrix2d.scale = function(out, a, v) {
    mat2d.scale(out.array, a.array, v.array);
    out._dirty = true;
    return out;
};

/**
 * @param  {clay.Matrix2d} out
 * @param  {clay.Matrix2d} a
 * @param  {clay.Vector2}  v
 * @return {clay.Matrix2d}
 */
Matrix2d.translate = function(out, a, v) {
    mat2d.translate(out.array, a.array, v.array);
    out._dirty = true;
    return out;
};

export default Matrix2d;
