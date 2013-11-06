define(function(require) {

    var Vector3 = require('./Vector3');
    var Vector2 = require('./Vector2');

    var Value = function() {};
    Value.prototype.get = function() {};
    Value.prototype.set = function(val) {};

    // Constant
    var ConstantValue = function(val) {
        this.get = function() {
            return val;
        }
    }
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
        }
    }
    VectorValue.prototype = new Value();
    VectorValue.prototype.constructor = VectorValue;
    //Random 1D
    var Random1D = function(min, max) {
        var range = max - min;
        this.get = function() {
            return Math.random() * range + min;
        }
    }
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
            out.set(
                rangeX * Math.random() + min._array[0],
                rangeY * Math.random() + min._array[1]
            );

            return out;
        }
    }
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
            out.set(
                rangeX * Math.random() + min._array[0],
                rangeY * Math.random() + min._array[1],
                rangeZ * Math.random() + min._array[2]
            );

            return out;
        }
    }
    Random3D.prototype = new Value()
    Random3D.prototype.constructor = Random3D;

    // Factory methods
    Value.constant = function(constant) {
        return new ConstantValue(constant);
    }
    Value.vector = function(vector) {
        return new VectorValue(vector);
    }

    Value.random1D = function(min, max) {
        return new Random1D(min, max);
    }

    Value.random2D = function(min, max) {
        return new Random2D(min, max);
    }

    Value.random3D = function(min, max) {
        return new Random3D(min, max);
    }

    return Value;
});