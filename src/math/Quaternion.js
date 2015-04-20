define(function(require) {

    'use strict';

    var glMatrix = require('../dep/glmatrix');
    var quat = glMatrix.quat;

    var KEY_ARRAY = '_array';
    var KEY_DIRTY = '_dirty';

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
        this[KEY_ARRAY] = quat.fromValues(x, y, z, w);

        /**
         * Dirty flag is used by the Node to determine
         * if the matrix is updated to latest
         * @name _dirty
         * @type {boolean}
         */
        this[KEY_DIRTY] = true;
    };

    Quaternion.prototype = {

        constructor: Quaternion,

        /**
         * Add b to self
         * @param  {qtek.math.Quaternion} b
         * @return {qtek.math.Quaternion}
         */
        add: function(b) {
            quat.add(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Calculate the w component from x, y, z component
         * @return {qtek.math.Quaternion}
         */
        calculateW: function() {
            quat.calculateW(this[KEY_ARRAY], this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
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
            this[KEY_ARRAY][0] = x;
            this[KEY_ARRAY][1] = y;
            this[KEY_ARRAY][2] = z;
            this[KEY_ARRAY][3] = w;
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Set x, y, z and w components from array
         * @param  {Float32Array|number[]} arr
         * @return {qtek.math.Quaternion}
         */
        setArray: function(arr) {
            this[KEY_ARRAY][0] = arr[0];
            this[KEY_ARRAY][1] = arr[1];
            this[KEY_ARRAY][2] = arr[2];
            this[KEY_ARRAY][3] = arr[3];

            this[KEY_DIRTY] = true;
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
            quat.conjugate(this[KEY_ARRAY], this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Copy from b
         * @param  {qtek.math.Quaternion} b
         * @return {qtek.math.Quaternion}
         */
        copy: function(b) {
            quat.copy(this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Dot product of self and b
         * @param  {qtek.math.Quaternion} b
         * @return {number}
         */
        dot: function(b) {
            return quat.dot(this[KEY_ARRAY], b[KEY_ARRAY]);
        },

        /**
         * Set from the given 3x3 rotation matrix
         * @param  {qtek.math.Matrix3} m
         * @return {qtek.math.Quaternion}
         */
        fromMat3: function(m) {
            quat.fromMat3(this[KEY_ARRAY], m[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
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
                mat3.fromMat4(m3, m[KEY_ARRAY]);
                // TODO Not like mat4, mat3 in glmatrix seems to be row-based
                mat3.transpose(m3, m3);
                quat.fromMat3(this[KEY_ARRAY], m3);
                this[KEY_DIRTY] = true;
                return this;
            };
        })(),

        /**
         * Set to identity quaternion
         * @return {qtek.math.Quaternion}
         */
        identity: function() {
            quat.identity(this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },
        /**
         * Invert self
         * @return {qtek.math.Quaternion}
         */
        invert: function() {
            quat.invert(this[KEY_ARRAY], this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },
        /**
         * Alias of length
         * @return {number}
         */
        len: function() {
            return quat.len(this[KEY_ARRAY]);
        },

        /**
         * Calculate the length
         * @return {number}
         */
        length: function() {
            return quat.length(this[KEY_ARRAY]);
        },

        /**
         * Linear interpolation between a and b
         * @param  {qtek.math.Quaternion} a
         * @param  {qtek.math.Quaternion} b
         * @param  {number}  t
         * @return {qtek.math.Quaternion}
         */
        lerp: function(a, b, t) {
            quat.lerp(this[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY], t);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Alias for multiply
         * @param  {qtek.math.Quaternion} b
         * @return {qtek.math.Quaternion}
         */
        mul: function(b) {
            quat.mul(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Alias for multiplyLeft
         * @param  {qtek.math.Quaternion} a
         * @return {qtek.math.Quaternion}
         */
        mulLeft: function(a) {
            quat.multiply(this[KEY_ARRAY], a[KEY_ARRAY], this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Mutiply self and b
         * @param  {qtek.math.Quaternion} b
         * @return {qtek.math.Quaternion}
         */
        multiply: function(b) {
            quat.multiply(this[KEY_ARRAY], this[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Mutiply a and self
         * Quaternion mutiply is not commutative, so the result of mutiplyLeft is different with multiply.
         * @param  {qtek.math.Quaternion} a
         * @return {qtek.math.Quaternion}
         */
        multiplyLeft: function(a) {
            quat.multiply(this[KEY_ARRAY], a[KEY_ARRAY], this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Normalize self
         * @return {qtek.math.Quaternion}
         */
        normalize: function() {
            quat.normalize(this[KEY_ARRAY], this[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Rotate self by a given radian about X axis
         * @param {number} rad
         * @return {qtek.math.Quaternion}
         */
        rotateX: function(rad) {
            quat.rotateX(this[KEY_ARRAY], this[KEY_ARRAY], rad); 
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Rotate self by a given radian about Y axis
         * @param {number} rad
         * @return {qtek.math.Quaternion}
         */
        rotateY: function(rad) {
            quat.rotateY(this[KEY_ARRAY], this[KEY_ARRAY], rad);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Rotate self by a given radian about Z axis
         * @param {number} rad
         * @return {qtek.math.Quaternion}
         */
        rotateZ: function(rad) {
            quat.rotateZ(this[KEY_ARRAY], this[KEY_ARRAY], rad);
            this[KEY_DIRTY] = true;
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
            quat.rotationTo(this[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
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
            quat.setAxes(this[KEY_ARRAY], view[KEY_ARRAY], right[KEY_ARRAY], up[KEY_ARRAY]);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Sets self with a rotation axis and rotation angle
         * @param {qtek.math.Vector3} axis
         * @param {number} rad
         * @return {qtek.math.Quaternion}
         */
        setAxisAngle: function(axis, rad) {
            quat.setAxisAngle(this[KEY_ARRAY], axis[KEY_ARRAY], rad);
            this[KEY_DIRTY] = true;
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
            quat.slerp(this[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY], t);
            this[KEY_DIRTY] = true;
            return this;
        },

        /**
         * Alias for squaredLength
         * @return {number}
         */
        sqrLen: function() {
            return quat.sqrLen(this[KEY_ARRAY]);
        },

        /**
         * Squared length of self
         * @return {number}
         */
        squaredLength: function() {
            return quat.squaredLength(this[KEY_ARRAY]);
        },

        // Set quaternion from euler angle
        setFromEuler: function(v) {
            
        },

        toString: function() {
            return '[' + Array.prototype.join.call(this[KEY_ARRAY], ',') + ']';
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
         * @memberOf qtek.math.Quaternion
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
         * @memberOf qtek.math.Quaternion
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

        /**
         * @name w
         * @type {number}
         * @memberOf qtek.math.Quaternion
         * @instance
         */
        defineProperty(proto, 'w', {
            get: function () {
                return this[KEY_ARRAY][3];
            },
            set: function (value) {
                this[KEY_ARRAY][3] = value;
                this[KEY_DIRTY] = true;
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
        quat.add(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
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
        quat.set(out[KEY_ARRAY], x, y, z, w);
        out[KEY_DIRTY] = true;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} b
     * @return {qtek.math.Quaternion}
     */
    Quaternion.copy = function(out, b) {
        quat.copy(out[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} a
     * @return {qtek.math.Quaternion}
     */
    Quaternion.calculateW = function(out, a) {
        quat.calculateW(out[KEY_ARRAY], a[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} a
     * @return {qtek.math.Quaternion}
     */
    Quaternion.conjugate = function(out, a) {
        quat.conjugate(out[KEY_ARRAY], a[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @return {qtek.math.Quaternion}
     */
    Quaternion.identity = function(out) {
        quat.identity(out[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} a
     * @return {qtek.math.Quaternion}
     */
    Quaternion.invert = function(out, a) {
        quat.invert(out[KEY_ARRAY], a[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} a
     * @param  {qtek.math.Quaternion} b
     * @return {number}
     */
    Quaternion.dot = function(a, b) {
        return quat.dot(a[KEY_ARRAY], b[KEY_ARRAY]);
    };

    /**
     * @param  {qtek.math.Quaternion} a
     * @return {number}
     */
    Quaternion.len = function(a) {
        return quat.length(a[KEY_ARRAY]);
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
        quat.lerp(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY], t);
        out[KEY_DIRTY] = true;
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
        quat.slerp(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY], t);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} a
     * @param  {qtek.math.Quaternion} b
     * @return {qtek.math.Quaternion}
     */
    Quaternion.mul = function(out, a, b) {
        quat.multiply(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
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
        quat.rotateX(out[KEY_ARRAY], a[KEY_ARRAY], rad);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} a
     * @param  {number}     rad
     * @return {qtek.math.Quaternion}
     */
    Quaternion.rotateY = function(out, a, rad) {
        quat.rotateY(out[KEY_ARRAY], a[KEY_ARRAY], rad);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} a
     * @param  {number}     rad
     * @return {qtek.math.Quaternion}
     */
    Quaternion.rotateZ = function(out, a, rad) {
        quat.rotateZ(out[KEY_ARRAY], a[KEY_ARRAY], rad);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Vector3}    axis
     * @param  {number}     rad
     * @return {qtek.math.Quaternion}
     */
    Quaternion.setAxisAngle = function(out, axis, rad) {
        quat.setAxisAngle(out[KEY_ARRAY], axis[KEY_ARRAY], rad);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Quaternion} a
     * @return {qtek.math.Quaternion}
     */
    Quaternion.normalize = function(out, a) {
        quat.normalize(out[KEY_ARRAY], a[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} a
     * @return {number}
     */
    Quaternion.sqrLen = function(a) {
        return quat.sqrLen(a[KEY_ARRAY]);
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
        quat.fromMat3(out[KEY_ARRAY], m[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
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
        quat.setAxes(out[KEY_ARRAY], view[KEY_ARRAY], right[KEY_ARRAY], up[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    /**
     * @param  {qtek.math.Quaternion} out
     * @param  {qtek.math.Vector3}    a
     * @param  {qtek.math.Vector3}    b
     * @return {qtek.math.Quaternion}
     */
    Quaternion.rotationTo = function(out, a, b) {
        quat.rotationTo(out[KEY_ARRAY], a[KEY_ARRAY], b[KEY_ARRAY]);
        out[KEY_DIRTY] = true;
        return out;
    };

    return Quaternion;
});