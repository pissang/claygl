// @ts-nocheck
import Vector3 from './Vector3';
import Vector2 from './Vector2';

/**
 * Random or constant 1d, 2d, 3d vector generator
 * @constructor
 * @alias clay.Value
 */
const Value = function () {};

/**
 * @function
 * @param {number|clay.Vector2|clay.Vector3} [out]
 * @return {number|clay.Vector2|clay.Vector3}
 */
Value.prototype.get = function (out) {};

// Constant
const ConstantValue = function (val) {
  this.get = function () {
    return val;
  };
};
ConstantValue.prototype = new Value();
ConstantValue.prototype.constructor = ConstantValue;

// Vector
const VectorValue = function (val) {
  const Constructor = val.constructor;
  this.get = function (out) {
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
const Random1D = function (min, max) {
  const range = max - min;
  this.get = function () {
    return Math.random() * range + min;
  };
};
Random1D.prototype = new Value();
Random1D.prototype.constructor = Random1D;

// Random2D
const Random2D = function (min, max) {
  const rangeX = max.x - min.x;
  const rangeY = max.y - min.y;

  this.get = function (out) {
    if (!out) {
      out = new Vector2();
    }
    Vector2.set(out, rangeX * Math.random() + min.array[0], rangeY * Math.random() + min.array[1]);

    return out;
  };
};
Random2D.prototype = new Value();
Random2D.prototype.constructor = Random2D;

const Random3D = function (min, max) {
  const rangeX = max.x - min.x;
  const rangeY = max.y - min.y;
  const rangeZ = max.z - min.z;

  this.get = function (out) {
    if (!out) {
      out = new Vector3();
    }
    Vector3.set(
      out,
      rangeX * Math.random() + min.array[0],
      rangeY * Math.random() + min.array[1],
      rangeZ * Math.random() + min.array[2]
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
 * @return {clay.Value}
 */
Value.constant = function (constant) {
  return new ConstantValue(constant);
};

/**
 * Create a constant vector value(2d or 3d) generator
 * @param  {clay.Vector2|clay.Vector3} vector
 * @return {clay.Value}
 */
Value.vector = function (vector) {
  return new VectorValue(vector);
};

/**
 * Create a random 1d value generator
 * @param  {number} min
 * @param  {number} max
 * @return {clay.Value}
 */
Value.random1D = function (min, max) {
  return new Random1D(min, max);
};

/**
 * Create a random 2d value generator
 * @param  {clay.Vector2} min
 * @param  {clay.Vector2} max
 * @return {clay.Value}
 */
Value.random2D = function (min, max) {
  return new Random2D(min, max);
};

/**
 * Create a random 3d value generator
 * @param  {clay.Vector3} min
 * @param  {clay.Vector3} max
 * @return {clay.Value}
 */
Value.random3D = function (min, max) {
  return new Random3D(min, max);
};

export default Value;
