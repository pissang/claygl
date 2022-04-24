import * as vec4 from '../glmatrix/vec4';
import type Quaternion from './Quaternion';
import type Matrix4 from './Matrix4';
import { matrixOrVectorClassToString } from './util';

/**
 * @constructor
 * @alias clay.Vector4
 * @param x
 * @param y
 * @param z
 * @param w
 */
class Vector4 {
  /**
   * Storage of Vector4, read and write of x, y, z, w will change the values in array
   * All methods also operate on the array instead of x, y, z, w components
   * @name array
   * @type {Float32Array}
   * @memberOf clay.Vector4#
   */
  array: vec4.Vec4Array;

  constructor(x: number, y: number, z: number, w: number) {
    x = x || 0;
    y = y || 0;
    z = z || 0;
    w = w || 0;
    this.array = vec4.fromValues(x, y, z, w);
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

  get w() {
    return this.array[3];
  }
  set w(value: number) {
    this.array[3] = value;
  }

  /**
   * Add b to self
   * @param b
   */
  add(b: Vector4) {
    vec4.add(this.array, this.array, b.array);
    return this;
  }

  /**
   * Set x, y and z components
   * @param x
   * @param y
   * @param z
   * @param w
   */
  set(x: number, y: number, z: number, w: number) {
    const arr = this.array;
    arr[0] = x;
    arr[1] = y;
    arr[2] = z;
    arr[3] = w;
    return this;
  }

  /**
   * Set x, y, z and w components from array
   * @param from
   */
  setArray(from: vec4.Vec4Array) {
    const arr = this.array;
    arr[0] = from[0];
    arr[1] = from[1];
    arr[2] = from[2];
    arr[3] = from[3];

    return this;
  }

  /**
   * Clone a new Vector4
   */
  clone() {
    return new Vector4(this.x, this.y, this.z, this.w);
  }

  /**
   * Copy from b
   * @param b
   */
  copy(b: Vector4) {
    vec4.copy(this.array, b.array);
    return this;
  }

  /**
   * Alias for distance
   * @param b
   */
  dist(b: Vector4) {
    return vec4.dist(this.array, b.array);
  }

  /**
   * Distance between self and b
   * @param b
   */
  distance(b: Vector4) {
    return vec4.distance(this.array, b.array);
  }

  /**
   * Alias for divide
   * @param b
   */
  div(b: Vector4) {
    vec4.div(this.array, this.array, b.array);
    return this;
  }

  /**
   * Divide self by b
   * @param b
   */
  divide(b: Vector4) {
    vec4.divide(this.array, this.array, b.array);
    return this;
  }

  /**
   * Dot product of self and b
   * @param b
   */
  dot(b: Vector4) {
    return vec4.dot(this.array, b.array);
  }

  /**
   * Alias of length
   */
  len() {
    return vec4.len(this.array);
  }

  /**
   * Calculate the length
   */
  length() {
    return vec4.length(this.array);
  }
  /**
   * Linear interpolation between a and b
   * @param a
   * @param b
   * @param t
   */
  lerp(a: Vector4, b: Vector4, t: number) {
    vec4.lerp(this.array, a.array, b.array, t);
    return this;
  }

  /**
   * Minimum of self and b
   * @param b
   */
  min(b: Vector4) {
    vec4.min(this.array, this.array, b.array);
    return this;
  }

  /**
   * Maximum of self and b
   * @param b
   */
  max(b: Vector4) {
    vec4.max(this.array, this.array, b.array);
    return this;
  }

  /**
   * Alias for multiply
   * @param b
   */
  mul(b: Vector4) {
    vec4.mul(this.array, this.array, b.array);
    return this;
  }

  /**
   * Mutiply self and b
   * @param b
   */
  multiply(b: Vector4) {
    vec4.multiply(this.array, this.array, b.array);
    return this;
  }

  /**
   * Negate self
   */
  negate() {
    vec4.negate(this.array, this.array);
    return this;
  }

  /**
   * Normalize self
   */
  normalize() {
    vec4.normalize(this.array, this.array);
    return this;
  }

  /**
   * Generate random x, y, z, w components with a given scale
   * @param scale
   */
  random(scale: number) {
    vec4.random(this.array, scale);
    return this;
  }

  /**
   * Scale self
   * @param scale
   */
  scale(s: number) {
    vec4.scale(this.array, this.array, s);
    return this;
  }
  /**
   * Scale b and add to self
   * @param b
   * @param scale
   */
  scaleAndAdd(b: Vector4, s: number) {
    vec4.scaleAndAdd(this.array, this.array, b.array, s);
    return this;
  }

  /**
   * Alias for squaredDistance
   * @param b
   */
  sqrDist(b: Vector4) {
    return vec4.sqrDist(this.array, b.array);
  }

  /**
   * Squared distance between self and b
   * @param b
   */
  squaredDistance(b: Vector4) {
    return vec4.squaredDistance(this.array, b.array);
  }

  /**
   * Alias for squaredLength
   */
  sqrLen() {
    return vec4.sqrLen(this.array);
  }

  /**
   * Squared length of self
   */
  squaredLength() {
    return vec4.squaredLength(this.array);
  }

  /**
   * Alias for subtract
   * @param b
   */
  sub(b: Vector4) {
    vec4.sub(this.array, this.array, b.array);
    return this;
  }

  /**
   * Subtract b from self
   * @param b
   */
  subtract(b: Vector4) {
    vec4.subtract(this.array, this.array, b.array);
    return this;
  }

  /**
   * Transform self with a Matrix4 m
   * @param {clay.Matrix4} m
   */
  transformMat4(m: Matrix4) {
    vec4.transformMat4(this.array, this.array, m.array);
    return this;
  }

  /**
   * Transform self with a Quaternion q
   * @param {clay.Quaternion} q
   */
  transformQuat(q: Quaternion) {
    vec4.transformQuat(this.array, this.array, q.array);
    return this;
  }

  toString() {
    return matrixOrVectorClassToString(this, 4);
  }

  toArray() {
    return Array.prototype.slice.call(this.array);
  }
  /**
   * @param out
   * @param a
   * @param b
   */
  static add(out: Vector4, a: Vector4, b: Vector4) {
    vec4.add(out.array, a.array, b.array);
    return out;
  }

  /**
   * @param out
   * @param x
   * @param y
   * @param z
   */
  static set(out: Vector4, x: number, y: number, z: number, w: number) {
    vec4.set(out.array, x, y, z, w);
  }

  /**
   * @param out
   * @param b
   */
  static copy(out: Vector4, b: Vector4) {
    vec4.copy(out.array, b.array);
    return out;
  }

  /**
   * @param a
   * @param b
   */
  static dist(a: Vector4, b: Vector4) {
    return vec4.distance(a.array, b.array);
  }

  /**
   * @function
   * @param a
   * @param b
   */
  static distance = Vector4.dist;

  /**
   * @param out
   * @param a
   * @param b
   */
  static div(out: Vector4, a: Vector4, b: Vector4) {
    vec4.divide(out.array, a.array, b.array);
    return out;
  }

  /**
   * @function
   * @param out
   * @param a
   * @param b
   */
  static divide = Vector4.div;

  /**
   * @param a
   * @param b
   */
  static dot(a: Vector4, b: Vector4) {
    return vec4.dot(a.array, b.array);
  }

  /**
   * @param a
   */
  static len(b: Vector4) {
    return vec4.length(b.array);
  }

  // Vector4.length = Vector4.len;

  /**
   * @param out
   * @param a
   * @param b
   * @param t
   */
  static lerp(out: Vector4, a: Vector4, b: Vector4, t: number) {
    vec4.lerp(out.array, a.array, b.array, t);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param b
   */
  static min(out: Vector4, a: Vector4, b: Vector4) {
    vec4.min(out.array, a.array, b.array);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param b
   */
  static max(out: Vector4, a: Vector4, b: Vector4) {
    vec4.max(out.array, a.array, b.array);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param b
   */
  static mul(out: Vector4, a: Vector4, b: Vector4) {
    vec4.multiply(out.array, a.array, b.array);
    return out;
  }

  /**
   * @function
   * @param out
   * @param a
   * @param b
   */
  static multiply = Vector4.mul;

  /**
   * @param out
   * @param a
   */
  static negate(out: Vector4, a: Vector4) {
    vec4.negate(out.array, a.array);
    return out;
  }

  /**
   * @param out
   * @param a
   */
  static normalize(out: Vector4, a: Vector4) {
    vec4.normalize(out.array, a.array);
    return out;
  }

  /**
   * @param out
   * @param scale
   */
  static random(out: Vector4, scale: number) {
    vec4.random(out.array, scale);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param scale
   */
  static scale(out: Vector4, a: Vector4, scale: number) {
    vec4.scale(out.array, a.array, scale);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param b
   * @param scale
   */
  static scaleAndAdd(out: Vector4, a: Vector4, b: Vector4, scale: number) {
    vec4.scaleAndAdd(out.array, a.array, b.array, scale);
    return out;
  }

  /**
   * @param a
   * @param b
   */
  static sqrDist(a: Vector4, b: Vector4) {
    return vec4.sqrDist(a.array, b.array);
  }

  /**
   * @function
   * @param a
   * @param b
   */
  static squaredDistance = Vector4.sqrDist;

  /**
   * @param a
   */
  static sqrLen(a: Vector4) {
    return vec4.sqrLen(a.array);
  }
  /**
   * @function
   * @param a
   */
  static squaredLength = Vector4.sqrLen;

  /**
   * @param out
   * @param a
   * @param b
   */
  static sub(out: Vector4, a: Vector4, b: Vector4) {
    vec4.subtract(out.array, a.array, b.array);
    return out;
  }
  /**
   * @function
   * @param out
   * @param a
   * @param b
   */
  static subtract = Vector4.sub;

  /**
   * @param out
   * @param a
   * @param m
   */
  static transformMat4(out: Vector4, a: Vector4, m: Matrix4) {
    vec4.transformMat4(out.array, a.array, m.array);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param q
   */
  static transformQuat(out: Vector4, a: Vector4, q: Quaternion) {
    vec4.transformQuat(out.array, a.array, q.array);
    return out;
  }
}

export default Vector4;
