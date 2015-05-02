define(function(require) {

    'use strict';

    var glMatrix = require('../dep/glmatrix');
    var quat = glMatrix.quat;

    /**
     * @constructor
     * @alias qtek.math.Quaternion
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} w
     */
    var Quaternion = function(x, y, z, w) {

        x = x || 0;
        y = y || 0;
        z = z || 0;
        w = w === undefined ? 1 : w;

        /**
         * Storage of Quaternion, read and write of x, y, z, w will change the values in _array
         * All methods also operate on the _array instead of x, y, z, w components
         * @name _array
         * @type {Float32Array}
         */
        this._array = quat.fromValues(x, y, z, w);

        /**
         * Dirty flag is used by the Node to determine
         * if the matrix is updated to latest
         * @name _dirty
         * @type {boolean}
         */
        this._dirty = true;
    };

    Quaternion.prototype = {

        constructor: Quaternion,

        /**
         * Add b to self
         * @param  {qtek.math.Quaternion} b
         * @return {qtek.math.Quaternion}
         */
        add: function(b) {
            quat.add(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Calculate the w component from x, y, z component
         * @return {qtek.math.Quaternion}
         */
        calculateW: function() {
            quat.calculateW(this._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Set x, y and z components
         * @param  {number}  x
         * @param  {number}  y
         * @param  {number}  z
         * @param  {number}  w
         * @return {qtek.math.Quaternion}
         */
        set: function(x, y, z, w) {
            this._array[0] = x;
            this._array[1] = y;
            this._array[2] = z;
            this._array[3] = w;
            this._dirty = true;
            return this;
        },

        /**
         * Set x, y, z and w components from array
         * @param  {Float32Array|number[]} arr
         * @return {qtek.math.Quaternion}
         */
        setArray: function(arr) {
            this._array[0] = arr[0];
            this._array[1] = arr[1];
            this._array[2] = arr[2];
            this._array[3] = arr[3];

            this._dirty = true;
            return this;
        },

        /**
         * Clone a new Quaternion
         * @return {qtek.math.Quaternion}
         */
        clone: function() {
            return new Quaternion(this.x, this.y, this.z, this.w);
        },

        /**
         * Calculates the conjugate of self If the quaternion is normalized, 
         * this function is faster than invert and produces the same result.
         * 
         * @return {qtek.math.Quaternion}
         */
        conjugate: function() {
            quat.conjugate(this._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Copy from b
         * @param  {qtek.math.Quaternion} b
         * @return {qtek.math.Quaternion}
         */
        copy: function(b) {
            quat.copy(this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Dot product of self and b
         * @param  {qtek.math.Quaternion} b
         * @return {number}
         */
        dot: function(b) {
            return quat.dot(this._array, b._array);
        },

        /**
         * Set from the given 3x3 rotation matrix
         * @param  {qtek.math.Matrix3} m
         * @return {qtek.math.Quaternion}
         */
        fromMat3: function(m) {
            quat.fromMat3(this._array, m._array);
            this._dirty = true;
            return this;
        },

        /**
         * Set from the given 4x4 rotation matrix
         * The 4th column and 4th row will be droped
         * @param  {qtek.math.Matrix4} m
         * @return {qtek.math.Quaternion}
         */
        fromMat4: (function() {
            var mat3 = glMatrix.mat3;
            var m3 = mat3.create();
            return function(m) {
                mat3.fromMat4(m3, m._array);
                // TODO Not like mat4, mat3 in glmatrix seems to be row-based
                mat3.transpose(m3, m3);
                quat.fromMat3(this._array, m3);
                this._dirty = true;
                return this;
            };
        })(),

        /**
         * Set to identity quaternion
         * @return {qtek.math.Quaternion}
         */
        identity: function() {
            quat.identity(this._array);
            this._dirty = true;
            return this;
        },
        /**
         * Invert self
         * @return {qtek.math.Quaternion}
         */
        invert: function() {
            quat.invert(this._array, this._array);
            this._dirty = true;
            return this;
        },
        /**
         * Alias of length
         * @return {number}
         */
        len: function() {
            return quat.len(this._array);
        },

        /**
         * Calculate the length
         * @return {number}
         */
        length: function() {
            return quat.length(this._array);
        },

        /**
         * Linear interpolation between a and b
         * @param  {qtek.math.Quaternion} a
         * @param  {qtek.math.Quaternion} b
         * @param  {number}  t
         * @return {qtek.math.Quaternion}
         */
        lerp: function(a, b, t) {
            quat.lerp(this._array, a._array, b._array, t);
            this._dirty = true;
            return this;
        },

        /**
         * Alias for multiply
         * @param  {qtek.math.Quaternion} b
         * @return {qtek.math.Quaternion}
         */
        mul: function(b) {
            quat.mul(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Alias for multiplyLeft
         * @param  {qtek.math.Quaternion} a
         * @return {qtek.math.Quaternion}
         */
        mulLeft: function(a) {
            quat.multiply(this._array, a._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Mutiply self and b
         * @param  {qtek.math.Quaternion} b
         * @return {qtek.math.Quaternion}
         */
        multiply: function(b) {
            quat.multiply(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        /**
         * Mutiply a and self
         * Quaternion mutiply is not commutative, so the result of mutiplyLeft is different with multiply.
         * @param  {qtek.math.Quaternion} a
         * @return {qtek.math.Quaternion}
         */
        multiplyLeft: function(a) {
            quat.multiply(this._array, a._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Normalize self
         * @return {qtek.math.Quaternion}
         */
        normalize: function() {
            quat.normalize(this._array, this._array);
            this._dirty = true;
            return this;
        },

        /**
         * Rotate self by a given radian about X axis
         * @param {number} rad
         * @return {qtek.math.Quaternion}
         */
        rotateX: function(rad) {
            quat.rotateX(this._array, this._array, rad); 
            this._dirty = true;
            return this;
        },

        /**
         * Rotate self by a given radian about Y axis
         * @param {number} rad
         * @return {qtek.math.Quaternion}
         */
        rotateY: function(rad) {
            quat.rotateY(this._array, this._array, rad);
            this._dirty = true;
            return this;
        },

        /**
         * Rotate self by a given radian about Z axis
         * @param {number} rad
         * @return {qtek.math.Quaternion}
         */
        rotateZ: function(rad) {
            quat.rotateZ(this._array, this._array, rad);
            this._dirty = true;
            return this;
        },

        /**
         * Sets self to represent the shortest rotation from Vector3 a to Vector3 b.
         * a and b needs to be normalized
         * @param  {qtek.math.Vector3} a
         * @param  {qtek.math.Vector3} b
         * @return {qtek.math.Quaternion}
         */
        rotationTo: function(a, b) {
            quat.rotationTo(this._array, a._array, b._array);
            this._dirty = true;
            return this;
        },
        /**
         * Sets self with values corresponding to the given axes
         * @param {qtek.math.Vector3} view
         * @param {qtek.math.Vector3} right
         * @param {qtek.math.Vector3} up
         * @return {qtek.math.Quaternion}
         */
        setAxes: function(view, right, up) {
            quat.setAxes(this._array, view._array, right._array, up._array);
            this._dirty = true;
            return this;
        },

        /**
         * Sets self with a rotation axis and rotation angle
         * @param {qtek.math.Vector3} axis
         * @param {number} rad
         * @return {qtek.math.Quaternion}
         */
        setAxisAngle: function(axis, rad) {
            quat.setAxisAngle(this._array, axis._array, rad);
            this._dirty = true;
            return this;
        },
        /**
         * Perform spherical linear interpolation between a and b
         * @param  {qtek.math.Quaternion} a
         * @param  {qtek.math.Quaternion} b
         * @param  {number} t
         * @return {qtek.math.Quaternion}
         */
        slerp: function(a, b, t) {
            quat.slerp(this._array, a._array, b._array, t);
            this._dirty = true;
            return this;
        },

        /**
         * Alias for squaredLength
         * @return {number}
         */
        sqrLen: function() {
            return quat.sqrLen(this._array);
        },

        /**
         * Squared length of self
         * @return {number}
         */
        squaredLength: function() {
            return quat.squaredLength(this._array);
        },

        // Set quaternion from euler angle
        setFromEuler: function(v) {
            
        },

        toString: function() {
            return '[' + Array.prototype.join.call(this._array, ',') + ']';
        }
    };

    var defineProperty = Object.defineProperty;
    // Getter and Setter
    if (defineProperty) {

        var proto = Quaternion.prototype;
        /**
         * @name x
         * @type {number}
         * @memberOf qtek.math.Quaternion
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
         * @memberOf qtek.math.Quaternion
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
         * @memberOf qtek.math.Quaternion
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

        /**
         * @name w
         * @type {number}
         * @memberOf qtek.math.Quaternion
         * @instance
         */
        defineProperty(proto, 'w', {
            get: function () {
                return this._array[3];
            },
            set: function (value) {
                this._array[3] = value;
                this._dirty = true;
            }
        });
    }

    // Supply methods that are not in place
    
    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} a
     * @param  {qtek.math.Quaternion} b
     * @return {qtek.math.Quaternion}
     */
    Quaternion.add = function(out, a, b) {
        quat.add(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {number}     x
     * @param  {number}     y
     * @param  {number}     z
     * @param  {number}     w
     * @return {qtek.math.Quaternion}
     */
    Quaternion.set = function(out, x, y, z, w) {
        quat.set(out._array, x, y, z, w);
        out._dirty = true;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} b
     * @return {qtek.math.Quaternion}
     */
    Quaternion.copy = function(out, b) {
        quat.copy(out._array, b._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} a
     * @return {qtek.math.Quaternion}
     */
    Quaternion.calculateW = function(out, a) {
        quat.calculateW(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} a
     * @return {qtek.math.Quaternion}
     */
    Quaternion.conjugate = function(out, a) {
        quat.conjugate(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @return {qtek.math.Quaternion}
     */
    Quaternion.identity = function(out) {
        quat.identity(out._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} a
     * @return {qtek.math.Quaternion}
     */
    Quaternion.invert = function(out, a) {
        quat.invert(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} a
     * @param  {qtek.math.Quaternion} b
     * @return {number}
     */
    Quaternion.dot = function(a, b) {
        return quat.dot(a._array, b._array);
    };

    /**
     * @param  {qtek.math.Quaternion} a
     * @return {number}
     */
    Quaternion.len = function(a) {
        return quat.length(a._array);
    };

    // Quaternion.length = Quaternion.len;

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} a
     * @param  {qtek.math.Quaternion} b
     * @param  {number}     t
     * @return {qtek.math.Quaternion}
     */
    Quaternion.lerp = function(out, a, b, t) {
        quat.lerp(out._array, a._array, b._array, t);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} a
     * @param  {qtek.math.Quaternion} b
     * @param  {number}     t
     * @return {qtek.math.Quaternion}
     */
    Quaternion.slerp = function(out, a, b, t) {
        quat.slerp(out._array, a._array, b._array, t);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} a
     * @param  {qtek.math.Quaternion} b
     * @return {qtek.math.Quaternion}
     */
    Quaternion.mul = function(out, a, b) {
        quat.multiply(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };

    /**
     * @method
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} a
     * @param  {qtek.math.Quaternion} b
     * @return {qtek.math.Quaternion}
     */
    Quaternion.multiply = Quaternion.mul;

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} a
     * @param  {number}     rad
     * @return {qtek.math.Quaternion}
     */
    Quaternion.rotateX = function(out, a, rad) {
        quat.rotateX(out._array, a._array, rad);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} a
     * @param  {number}     rad
     * @return {qtek.math.Quaternion}
     */
    Quaternion.rotateY = function(out, a, rad) {
        quat.rotateY(out._array, a._array, rad);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} a
     * @param  {number}     rad
     * @return {qtek.math.Quaternion}
     */
    Quaternion.rotateZ = function(out, a, rad) {
        quat.rotateZ(out._array, a._array, rad);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Vector3}    axis
     * @param  {number}     rad
     * @return {qtek.math.Quaternion}
     */
    Quaternion.setAxisAngle = function(out, axis, rad) {
        quat.setAxisAngle(out._array, axis._array, rad);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} a
     * @return {qtek.math.Quaternion}
     */
    Quaternion.normalize = function(out, a) {
        quat.normalize(out._array, a._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} a
     * @return {number}
     */
    Quaternion.sqrLen = function(a) {
        return quat.sqrLen(a._array);
    };

    /**
     * @method
     * @param  {qtek.math.Quaternion} a
     * @return {number}
     */
    Quaternion.squaredLength = Quaternion.sqrLen;

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Matrix3}    m
     * @return {qtek.math.Quaternion}
     */
    Quaternion.fromMat3 = function(out, m) {
        quat.fromMat3(out._array, m._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Vector3}    view
     * @param  {qtek.math.Vector3}    right
     * @param  {qtek.math.Vector3}    up
     * @return {qtek.math.Quaternion}
     */
    Quaternion.setAxes = function(out, view, right, up) {
        quat.setAxes(out._array, view._array, right._array, up._array);
        out._dirty = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Vector3}    a
     * @param  {qtek.math.Vector3}    b
     * @return {qtek.math.Quaternion}
     */
    Quaternion.rotationTo = function(out, a, b) {
        quat.rotationTo(out._array, a._array, b._array);
        out._dirty = true;
        return out;
    };

    return Quaternion;
});