define(function(require) {

    'use strict';

    var Vector3 = require('./Vector3');
    var Vector2 = require('./Vector2');

    /**
     * Random or constant 1d, 2d, 3d vector generator
     * @constructor
     * @alias qtek.math.Value
     */
    var Value = function() {};

    /**
     * @method
     * @param {number|qtek.math.Vector2|qtek.math.Vector3} [out]
     * @return {number|qtek.math.Vector2|qtek.math.Vector3}
     */
    Value.prototype.get = function(out) {};

    // Constant
    var ConstantValue = function(val) {
        this.get = function() {
            return val;
        };
    };
    ConstantValue.prototype = new Value();
    ConstantValue.prototype.constructor = ConstantValue;

    // Vector
    var VectorValue = function(val) {
        var Constructor = val.constructor;
        this.get = function(out) {
            if (!out) {
                out = new Constructor();
            }
            out.copy(val);
            return out;
        };
    };
    VectorValue.prototype = new Value();
    VectorValue.prototype.constructor = VectorValue;
    //Random 1D
    var Random1D = function(min, max) {
        var range = max - min;
        this.get = function() {
            return Math.random() * range + min;
        };
    };
    Random1D.prototype = new Value();
    Random1D.prototype.constructor = Random1D;

    // Random2D
    var Random2D = function(min, max) {
        var rangeX = max.x - min.x;
        var rangeY = max.y - min.y;

        this.get = function(out) {
            if (!out) {
                out = new Vector2();
            }
            Vector2.set(
                out,
                rangeX * Math.random() + min._array[0],
                rangeY * Math.random() + min._array[1]
            );

            return out;
        };
    };
    Random2D.prototype = new Value();
    Random2D.prototype.constructor = Random2D;

    var Random3D = function(min, max) {
        var rangeX = max.x - min.x;
        var rangeY = max.y - min.y;
        var rangeZ = max.z - min.z;

        this.get = function(out) {
            if (!out) {
                out = new Vector3();
            }
            Vector3.set(
                out,
                rangeX * Math.random() + min._array[0],
                rangeY * Math.random() + min._array[1],
                rangeZ * Math.random() + min._array[2]
            );

            return out;
        };
    };
    Random3D.prototype = new Value();
    Random3D.prototype.constructor = Random3D;

    // Factory methods
    
    /**
     * Create a constant 1d value generator
     * @param  {number} constant
     * @return {qtek.math.Value}
     */
    Value.constant = function(constant) {
        return new ConstantValue(constant);
    };

    /**
     * Create a constant vector value(2d or 3d) generator
     * @param  {qtek.math.Vector2|qtek.math.Vector3} vector
     * @return {qtek.math.Value}
     */
    Value.vector = function(vector) {
        return new VectorValue(vector);
    };

    /**
     * Create a random 1d value generator
     * @param  {number} min
     * @param  {number} max
     * @return {qtek.math.Value}
     */
    Value.random1D = function(min, max) {
        return new Random1D(min, max);
    };

    /**
     * Create a random 2d value generator
     * @param  {qtek.math.Vector2} min
     * @param  {qtek.math.Vector2} max
     * @return {qtek.math.Value}
     */
    Value.random2D = function(min, max) {
        return new Random2D(min, max);
    };

    /**
     * Create a random 3d value generator
     * @param  {qtek.math.Vector3} min
     * @param  {qtek.math.Vector3} max
     * @return {qtek.math.Value}
     */
    Value.random3D = function(min, max) {
        return new Random3D(min, max);
    };

    return Value;
});