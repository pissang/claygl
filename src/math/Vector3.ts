import * as vec3 from '../glmatrix/vec3';
import type Matrix3 from './Matrix3';
import type Matrix4 from './Matrix4';
import type Quaternion from './Quaternion';
import { matrixOrVectorClassToString } from './util';

function clamp(val: number, min: number, max: number) {
  return val < min ? min : val > max ? max : val;
}
const atan2 = Math.atan2;
const asin = Math.asin;
const abs = Math.abs;

export type RotateOrder = 'XYZ' | 'YXZ' | 'ZXY' | 'ZYX' | 'YZX' | 'XZY';
/**
 * @constructor
 * @alias clay.Vector3
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
class Vector3 {
  /**
   * Storage of Vector3, read and write of x, y, z will change the values in array
   * All methods also operate on the array instead of x, y, z components
   */
  array: vec3.Vec3Array;

  constructor(x?: number, y?: number, z?: number) {
    x = x || 0;
    y = y || 0;
    z = z || 0;
    this.array = vec3.fromValues(x, y, z);
  }

  get x() {
    return this.array[0];
  }
  set x(value: number) {
    this.array[0] = value;
  }

  get y() {
    return this.array[1];
  }
  set y(value: number) {
    this.array[1] = value;
  }

  get z() {
    return this.array[2];
  }
  set z(value: number) {
    this.array[2] = value;
  }
  /**
   * Add b to self
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  add(b: Vector3) {
    vec3.add(this.array, this.array, b.array);
    return this;
  }

  /**
   * Set x, y and z components
   * @param  {number}  x
   * @param  {number}  y
   * @param  {number}  z
   * @return {clay.Vector3}
   */
  set(x: number, y: number, z: number) {
    this.array[0] = x;
    this.array[1] = y;
    this.array[2] = z;
    return this;
  }

  /**
   * Set x, y and z components from array
   * @param  {Float32Array|number[]} arr
   * @return {clay.Vector3}
   */
  setArray(arr: number[]) {
    this.array[0] = arr[0];
    this.array[1] = arr[1];
    this.array[2] = arr[2];

    return this;
  }

  /**
   * Clone a new Vector3
   * @return {clay.Vector3}
   */
  clone() {
    return new Vector3(this.x, this.y, this.z);
  }

  /**
   * Copy from b
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  copy(b: Vector3) {
    vec3.copy(this.array, b.array);
    return this;
  }

  /**
   * Cross product of self and b, written to a Vector3 out
   * @param  {clay.Vector3} a
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  cross(a: Vector3, b: Vector3) {
    vec3.cross(this.array, a.array, b.array);
    return this;
  }

  /**
   * Alias for distance
   * @param  {clay.Vector3} b
   * @return {number}
   */
  dist(b: Vector3) {
    return vec3.dist(this.array, b.array);
  }

  /**
   * Distance between self and b
   * @param  {clay.Vector3} b
   * @return {number}
   */
  distance(b: Vector3) {
    return vec3.distance(this.array, b.array);
  }

  /**
   * Alias for divide
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  div(b: Vector3) {
    vec3.div(this.array, this.array, b.array);
    return this;
  }

  /**
   * Divide self by b
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  divide(b: Vector3) {
    vec3.divide(this.array, this.array, b.array);
    return this;
  }

  /**
   * Dot product of self and b
   * @param  {clay.Vector3} b
   * @return {number}
   */
  dot(b: Vector3) {
    return vec3.dot(this.array, b.array);
  }

  /**
   * Alias of length
   * @return {number}
   */
  len() {
    return vec3.len(this.array);
  }

  /**
   * Calculate the length
   * @return {number}
   */
  length() {
    return vec3.length(this.array);
  }
  /**
   * Linear interpolation between a and b
   * @param  {clay.Vector3} a
   * @param  {clay.Vector3} b
   * @param  {number}  t
   * @return {clay.Vector3}
   */
  lerp(a: Vector3, b: Vector3, t: number) {
    vec3.lerp(this.array, a.array, b.array, t);
    return this;
  }

  /**
   * Minimum of self and b
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  min(b: Vector3) {
    vec3.min(this.array, this.array, b.array);
    return this;
  }

  /**
   * Maximum of self and b
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  max(b: Vector3) {
    vec3.max(this.array, this.array, b.array);
    return this;
  }

  /**
   * Alias for multiply
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  mul(b: Vector3) {
    vec3.mul(this.array, this.array, b.array);
    return this;
  }

  /**
   * Mutiply self and b
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  multiply(b: Vector3) {
    vec3.multiply(this.array, this.array, b.array);
    return this;
  }

  /**
   * Negate self
   * @return {clay.Vector3}
   */
  negate() {
    vec3.negate(this.array, this.array);
    return this;
  }

  /**
   * Normalize self
   * @return {clay.Vector3}
   */
  normalize() {
    vec3.normalize(this.array, this.array);
    return this;
  }

  /**
   * Generate random x, y, z components with a given scale
   * @param  {number} scale
   * @return {clay.Vector3}
   */
  random(scale: number) {
    vec3.random(this.array, scale);
    return this;
  }

  /**
   * Scale self
   * @param  {number}  scale
   * @return {clay.Vector3}
   */
  scale(s: number) {
    vec3.scale(this.array, this.array, s);
    return this;
  }

  /**
   * Scale b and add to self
   * @param  {clay.Vector3} b
   * @param  {number}  scale
   * @return {clay.Vector3}
   */
  scaleAndAdd(b: Vector3, s: number) {
    vec3.scaleAndAdd(this.array, this.array, b.array, s);
    return this;
  }

  /**
   * Alias for squaredDistance
   * @param  {clay.Vector3} b
   * @return {number}
   */
  sqrDist(b: Vector3) {
    return vec3.sqrDist(this.array, b.array);
  }

  /**
   * Squared distance between self and b
   * @param  {clay.Vector3} b
   * @return {number}
   */
  squaredDistance(b: Vector3) {
    return vec3.squaredDistance(this.array, b.array);
  }

  /**
   * Alias for squaredLength
   * @return {number}
   */
  sqrLen() {
    return vec3.sqrLen(this.array);
  }

  /**
   * Squared length of self
   * @return {number}
   */
  squaredLength() {
    return vec3.squaredLength(this.array);
  }

  /**
   * Alias for subtract
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  sub(b: Vector3) {
    vec3.sub(this.array, this.array, b.array);
    return this;
  }

  /**
   * Subtract b from self
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  subtract(b: Vector3) {
    vec3.subtract(this.array, this.array, b.array);
    return this;
  }

  /**
   * Transform self with a Matrix3 m
   * @param  {clay.Matrix3} m
   * @return {clay.Vector3}
   */
  transformMat3(m: Matrix3) {
    vec3.transformMat3(this.array, this.array, m.array);
    return this;
  }

  /**
   * Transform self with a Matrix4 m
   * @param  {clay.Matrix4} m
   * @return {clay.Vector3}
   */
  transformMat4(m: Matrix4) {
    vec3.transformMat4(this.array, this.array, m.array);
    return this;
  }
  /**
   * Transform self with a Quaternion q
   * @param  {clay.Quaternion} q
   * @return {clay.Vector3}
   */
  transformQuat(q: Quaternion) {
    vec3.transformQuat(this.array, this.array, q.array);
    return this;
  }

  /**
   * Trasnform self into projection space with m
   * @param  {clay.Matrix4} m
   * @return {clay.Vector3}
   */
  applyProjection(m: Matrix4) {
    const v = this.array;
    const ma = m.array;

    // Perspective projection
    if (ma[15] === 0) {
      const w = -1 / v[2];
      v[0] = ma[0] * v[0] * w;
      v[1] = ma[5] * v[1] * w;
      v[2] = (ma[10] * v[2] + ma[14]) * w;
    } else {
      v[0] = ma[0] * v[0] + ma[12];
      v[1] = ma[5] * v[1] + ma[13];
      v[2] = ma[10] * v[2] + ma[14];
    }

    return this;
  }

  eulerFromQuat(q: Quaternion, order: RotateOrder) {
    return Vector3.eulerFromQuat(this, q, order);
  }

  eulerFromMat3(m: Matrix3, order: RotateOrder) {
    return Vector3.eulerFromMat3(this, m, order);
  }

  toString() {
    return matrixOrVectorClassToString(this, 3);
  }

  toArray() {
    return Array.prototype.slice.call(this.array);
  }

  /**
   * @param  {clay.Vector3} out
   * @param  {clay.Vector3} a
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  static add(out: Vector3, a: Vector3, b: Vector3) {
    vec3.add(out.array, a.array, b.array);
    return out;
  }

  /**
   * @param  {clay.Vector3} out
   * @param  {number}  x
   * @param  {number}  y
   * @param  {number}  z
   * @return {clay.Vector3}
   */
  static set(out: Vector3, x: number, y: number, z: number) {
    vec3.set(out.array, x, y, z);
  }

  /**
   * @param  {clay.Vector3} out
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  static copy(out: Vector3, b: Vector3) {
    vec3.copy(out.array, b.array);
    return out;
  }

  /**
   * @param  {clay.Vector3} out
   * @param  {clay.Vector3} a
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  static cross(out: Vector3, a: Vector3, b: Vector3) {
    vec3.cross(out.array, a.array, b.array);
    return out;
  }

  /**
   * @param  {clay.Vector3} a
   * @param  {clay.Vector3} b
   * @return {number}
   */
  static dist(a: Vector3, b: Vector3) {
    return vec3.distance(a.array, b.array);
  }

  /**
   * @function
   * @param  {clay.Vector3} a
   * @param  {clay.Vector3} b
   * @return {number}
   */
  static distance = Vector3.dist;

  /**
   * @param  {clay.Vector3} out
   * @param  {clay.Vector3} a
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  static div(out: Vector3, a: Vector3, b: Vector3) {
    vec3.divide(out.array, a.array, b.array);
    return out;
  }

  /**
   * @function
   * @param  {clay.Vector3} out
   * @param  {clay.Vector3} a
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  static divide = Vector3.div;

  /**
   * @param  {clay.Vector3} a
   * @param  {clay.Vector3} b
   * @return {number}
   */
  static dot(a: Vector3, b: Vector3) {
    return vec3.dot(a.array, b.array);
  }

  /**
   * @param  {clay.Vector3} a
   * @return {number}
   */
  static len(b: Vector3) {
    return vec3.length(b.array);
  }

  // Vector3.length = Vector3.len;

  /**
   * @param  {clay.Vector3} out
   * @param  {clay.Vector3} a
   * @param  {clay.Vector3} b
   * @param  {number}  t
   * @return {clay.Vector3}
   */
  static lerp(out: Vector3, a: Vector3, b: Vector3, t: number) {
    vec3.lerp(out.array, a.array, b.array, t);
    return out;
  }
  /**
   * @param  {clay.Vector3} out
   * @param  {clay.Vector3} a
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  static min(out: Vector3, a: Vector3, b: Vector3) {
    vec3.min(out.array, a.array, b.array);
    return out;
  }

  /**
   * @param  {clay.Vector3} out
   * @param  {clay.Vector3} a
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  static max(out: Vector3, a: Vector3, b: Vector3) {
    vec3.max(out.array, a.array, b.array);
    return out;
  }
  /**
   * @param  {clay.Vector3} out
   * @param  {clay.Vector3} a
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  static mul(out: Vector3, a: Vector3, b: Vector3) {
    vec3.multiply(out.array, a.array, b.array);
    return out;
  }
  /**
   * @function
   * @param  {clay.Vector3} out
   * @param  {clay.Vector3} a
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  static multiply = Vector3.mul;
  /**
   * @param  {clay.Vector3} out
   * @param  {clay.Vector3} a
   * @return {clay.Vector3}
   */
  static negate(out: Vector3, a: Vector3) {
    vec3.negate(out.array, a.array);
    return out;
  }
  /**
   * @param  {clay.Vector3} out
   * @param  {clay.Vector3} a
   * @return {clay.Vector3}
   */
  static normalize(out: Vector3, a: Vector3) {
    vec3.normalize(out.array, a.array);
    return out;
  }
  /**
   * @param  {clay.Vector3} out
   * @param  {number}  scale
   * @return {clay.Vector3}
   */
  static random(out: Vector3, scale: number) {
    vec3.random(out.array, scale);
    return out;
  }
  /**
   * @param  {clay.Vector3} out
   * @param  {clay.Vector3} a
   * @param  {number}  scale
   * @return {clay.Vector3}
   */
  static scale(out: Vector3, a: Vector3, scale: number) {
    vec3.scale(out.array, a.array, scale);
    return out;
  }
  /**
   * @param  {clay.Vector3} out
   * @param  {clay.Vector3} a
   * @param  {clay.Vector3} b
   * @param  {number}  scale
   * @return {clay.Vector3}
   */
  static scaleAndAdd(out: Vector3, a: Vector3, b: Vector3, scale: number) {
    vec3.scaleAndAdd(out.array, a.array, b.array, scale);
    return out;
  }
  /**
   * @param  {clay.Vector3} a
   * @param  {clay.Vector3} b
   * @return {number}
   */
  static sqrDist(a: Vector3, b: Vector3) {
    return vec3.sqrDist(a.array, b.array);
  }
  /**
   * @function
   * @param  {clay.Vector3} a
   * @param  {clay.Vector3} b
   * @return {number}
   */
  static squaredDistance = Vector3.sqrDist;
  /**
   * @param  {clay.Vector3} a
   * @return {number}
   */
  static sqrLen(a: Vector3) {
    return vec3.sqrLen(a.array);
  }
  /**
   * @function
   * @param  {clay.Vector3} a
   * @return {number}
   */
  static squaredLength = Vector3.sqrLen;

  /**
   * @param  {clay.Vector3} out
   * @param  {clay.Vector3} a
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  static sub(out: Vector3, a: Vector3, b: Vector3) {
    vec3.subtract(out.array, a.array, b.array);
    return out;
  }
  /**
   * @function
   * @param  {clay.Vector3} out
   * @param  {clay.Vector3} a
   * @param  {clay.Vector3} b
   * @return {clay.Vector3}
   */
  static subtract = Vector3.sub;

  /**
   * @param  {clay.Vector3} out
   * @param  {clay.Vector3} a
   * @param  {Matrix3} m
   * @return {clay.Vector3}
   */
  static transformMat3(out: Vector3, a: Vector3, m: Matrix3) {
    vec3.transformMat3(out.array, a.array, m.array);
    return out;
  }

  /**
   * @param  {clay.Vector3} out
   * @param  {clay.Vector3} a
   * @param  {clay.Matrix4} m
   * @return {clay.Vector3}
   */
  static transformMat4(out: Vector3, a: Vector3, m: Matrix4) {
    vec3.transformMat4(out.array, a.array, m.array);
    return out;
  }
  /**
   * @param  {clay.Vector3} out
   * @param  {clay.Vector3} a
   * @param  {clay.Quaternion} q
   * @return {clay.Vector3}
   */
  static transformQuat(out: Vector3, a: Vector3, q: Quaternion) {
    vec3.transformQuat(out.array, a.array, q.array);
    return out;
  }

  /**
   * Convert quaternion to euler angle
   * Quaternion must be normalized
   * From three.js
   */
  static eulerFromQuat(out: Vector3, q: Quaternion, order: RotateOrder) {
    const qa = q.array;

    const target = out.array;
    const x = qa[0],
      y = qa[1],
      z = qa[2],
      w = qa[3];
    const x2 = x * x;
    const y2 = y * y;
    const z2 = z * z;
    const w2 = w * w;

    order = (order || 'XYZ').toUpperCase() as RotateOrder;

    switch (order) {
      case 'XYZ':
        target[0] = atan2(2 * (x * w - y * z), w2 - x2 - y2 + z2);
        target[1] = asin(clamp(2 * (x * z + y * w), -1, 1));
        target[2] = atan2(2 * (z * w - x * y), w2 + x2 - y2 - z2);
        break;
      case 'YXZ':
        target[0] = asin(clamp(2 * (x * w - y * z), -1, 1));
        target[1] = atan2(2 * (x * z + y * w), w2 - x2 - y2 + z2);
        target[2] = atan2(2 * (x * y + z * w), w2 - x2 + y2 - z2);
        break;
      case 'ZXY':
        target[0] = asin(clamp(2 * (x * w + y * z), -1, 1));
        target[1] = atan2(2 * (y * w - z * x), w2 - x2 - y2 + z2);
        target[2] = atan2(2 * (z * w - x * y), w2 - x2 + y2 - z2);
        break;
      case 'ZYX':
        target[0] = atan2(2 * (x * w + z * y), w2 - x2 - y2 + z2);
        target[1] = asin(clamp(2 * (y * w - x * z), -1, 1));
        target[2] = atan2(2 * (x * y + z * w), w2 + x2 - y2 - z2);
        break;
      case 'YZX':
        target[0] = atan2(2 * (x * w - z * y), w2 - x2 + y2 - z2);
        target[1] = atan2(2 * (y * w - x * z), w2 + x2 - y2 - z2);
        target[2] = asin(clamp(2 * (x * y + z * w), -1, 1));
        break;
      case 'XZY':
        target[0] = atan2(2 * (x * w + y * z), w2 - x2 + y2 - z2);
        target[1] = atan2(2 * (x * z + y * w), w2 + x2 - y2 - z2);
        target[2] = asin(clamp(2 * (z * w - x * y), -1, 1));
        break;
      default:
        console.warn('Unkown order: ' + order);
    }
    return out;
  }

  /**
   * Convert rotation matrix to euler angle
   * from three.js
   */
  static eulerFromMat3(out: Vector3, m: Matrix3, order: RotateOrder) {
    // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)
    const te = m.array;
    const m11 = te[0],
      m12 = te[3],
      m13 = te[6];
    const m21 = te[1],
      m22 = te[4],
      m23 = te[7];
    const m31 = te[2],
      m32 = te[5],
      m33 = te[8];
    const target = out.array;

    order = (order || 'XYZ').toUpperCase() as RotateOrder;

    switch (order) {
      case 'XYZ':
        target[1] = asin(clamp(m13, -1, 1));
        if (abs(m13) < 0.99999) {
          target[0] = atan2(-m23, m33);
          target[2] = atan2(-m12, m11);
        } else {
          target[0] = atan2(m32, m22);
          target[2] = 0;
        }
        break;
      case 'YXZ':
        target[0] = asin(-clamp(m23, -1, 1));
        if (abs(m23) < 0.99999) {
          target[1] = atan2(m13, m33);
          target[2] = atan2(m21, m22);
        } else {
          target[1] = atan2(-m31, m11);
          target[2] = 0;
        }
        break;
      case 'ZXY':
        target[0] = asin(clamp(m32, -1, 1));
        if (abs(m32) < 0.99999) {
          target[1] = atan2(-m31, m33);
          target[2] = atan2(-m12, m22);
        } else {
          target[1] = 0;
          target[2] = atan2(m21, m11);
        }
        break;
      case 'ZYX':
        target[1] = asin(-clamp(m31, -1, 1));
        if (abs(m31) < 0.99999) {
          target[0] = atan2(m32, m33);
          target[2] = atan2(m21, m11);
        } else {
          target[0] = 0;
          target[2] = atan2(-m12, m22);
        }
        break;
      case 'YZX':
        target[2] = asin(clamp(m21, -1, 1));
        if (abs(m21) < 0.99999) {
          target[0] = atan2(-m23, m22);
          target[1] = atan2(-m31, m11);
        } else {
          target[0] = 0;
          target[1] = atan2(m13, m33);
        }
        break;
      case 'XZY':
        target[2] = asin(-clamp(m12, -1, 1));
        if (abs(m12) < 0.99999) {
          target[0] = atan2(m32, m22);
          target[1] = atan2(m13, m11);
        } else {
          target[0] = atan2(-m23, m33);
          target[1] = 0;
        }
        break;
      default:
        console.warn('Unkown order: ' + order);
    }

    return out;
  }

  /**
   * @type {clay.Vector3}
   * @readOnly
   * @memberOf clay.Vector3
   */
  static get POSITIVE_X() {
    return new Vector3(1, 0, 0);
  }
  /**
   * @type {clay.Vector3}
   * @readOnly
   * @memberOf clay.Vector3
   */
  static get NEGATIVE_X() {
    return new Vector3(-1, 0, 0);
  }
  /**
   * @type {clay.Vector3}
   * @readOnly
   * @memberOf clay.Vector3
   */
  static get POSITIVE_Y() {
    return new Vector3(0, 1, 0);
  }
  /**
   * @type {clay.Vector3}
   * @readOnly
   * @memberOf clay.Vector3
   */
  static get NEGATIVE_Y() {
    return new Vector3(0, -1, 0);
  }
  /**
   * @type {clay.Vector3}
   * @readOnly
   * @memberOf clay.Vector3
   */
  static get POSITIVE_Z() {
    return new Vector3(0, 0, 1);
  }
  /**
   * @type {clay.Vector3}
   * @readOnly
   */
  static get NEGATIVE_Z() {
    return new Vector3(0, 0, -1);
  }
  /**
   * @type {clay.Vector3}
   * @readOnly
   * @memberOf clay.Vector3
   */
  static get UP() {
    return new Vector3(0, 1, 0);
  }
  /**
   * @type {clay.Vector3}
   * @readOnly
   * @memberOf clay.Vector3
   */
  static get ZERO() {
    return new Vector3();
  }
}

export default Vector3;
