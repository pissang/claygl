import Vector3 from './Vector3';
import Vector2 from './Vector2';
import Vector4 from './Vector4';

/**
 * Random or constant 1d, 2d, 3d vector generator
 */

export interface Value<T> {
  get(out?: T): T;
}

class ConstantValue implements Value<number> {
  private _val: number;
  constructor(val: number) {
    this._val = val;
  }
  get() {
    return this._val;
  }
}

type Vector = Vector2 | Vector3 | Vector4;
class VectorValue<T extends Vector = Vector> implements Value<T> {
  private _val: T;
  constructor(val: T) {
    this._val = val;
  }

  get(out?: T) {
    const val = this._val;
    if (!out) {
      out = new (val.constructor as any)();
    }
    out!.copy(val as any);
    return out as T;
  }
}

class Random1D {
  private _min: number;
  private _max: number;
  constructor(min: number, max: number) {
    this._min = min;
    this._max = max;
  }

  get() {
    return Math.random() * (this._max - this._min) + this._min;
  }
}

class Random2D {
  private _min: Vector2;
  private _max: Vector2;
  constructor(min: Vector2, max: Vector2) {
    this._min = min;
    this._max = max;
  }

  get(out?: Vector2): Vector2 {
    const min = this._min.array;
    const max = this._max.array;
    if (!out) {
      out = new Vector2();
    }
    Vector2.set(
      out,
      (max[0] - min[0]) * Math.random() + min[0],
      (max[1] - min[1]) * Math.random() + min[1]
    );

    return out;
  }
}

class Random3D {
  private _min: Vector3;
  private _max: Vector3;
  constructor(min: Vector3, max: Vector3) {
    this._min = min;
    this._max = max;
  }

  get(out?: Vector3): Vector3 {
    const min = this._min.array;
    const max = this._max.array;
    if (!out) {
      out = new Vector3();
    }
    Vector3.set(
      out,
      (max[0] - min[0]) * Math.random() + min[0],
      (max[1] - min[1]) * Math.random() + min[1],
      (max[2] - min[2]) * Math.random() + min[2]
    );

    return out;
  }
}

// Factory methods

/**
 * Create a constant 1d value generator
 * @param constant
 */
export function constant(constant: number) {
  return new ConstantValue(constant);
}

/**
 * Create a constant vector value(2d or 3d) generator
 * @param vector
 */
export function vector(vector: Vector) {
  return new VectorValue(vector);
}

/**
 * Create a random 1d value generator
 * @param min
 * @param max
 */
export function random1D(min: number, max: number) {
  return new Random1D(min, max);
}

/**
 * Create a random 2d value generator
 * @param min
 * @param max
 */
export function random2D(min: Vector2, max: Vector2) {
  return new Random2D(min, max);
}

/**
 * Create a random 3d value generator
 * @param min
 * @param max
 */
export function random3D(min: Vector3, max: Vector3) {
  return new Random3D(min, max);
}
