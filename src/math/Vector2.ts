import * as vec2 from '../glmatrix/vec2';
import type Matrix2 from './Matrix2';
import type Matrix2d from './Matrix2d';
import type Matrix3 from './Matrix3';
import type Matrix4 from './Matrix4';
import { matrixOrVectorClassToString } from './util';
import Vector3 from './Vector3';

/**
 * @constructor
 * @alias clay.Vector2
 * @param
 * @param
 */
class Vector2 {
  /**
   * Storage of Vector2, read and write of x, y will change the values in array
   * All methods also operate on the array instead of x, y components
   */
  array: vec2.Vec2Array;

  constructor(x?: number, y?: number) {
    x = x || 0;
    y = y || 0;

    this.array = vec2.fromValues(x, y);
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

  /**
   * Add b to self
   * @param b
   */
  add(b: Vector2) {
    vec2.add(this.array, this.array, b.array);
    return this;
  }

  /**
   * Set x and y components
   * @param x
   * @param y
   */
  set(x: number, y: number) {
    this.array[0] = x;
    this.array[1] = y;
    return this;
  }

  /**
   * Set x and y components from array
   * @param arr
   */
  setArray(arr: vec2.Vec2Array) {
    this.array[0] = arr[0];
    this.array[1] = arr[1];
    return this;
  }

  /**
   * Clone a new Vector2
   */
  clone() {
    return new Vector2(this.x, this.y);
  }

  /**
   * Copy x, y from b
   * @param b
   */
  copy(b: Vector2) {
    vec2.copy(this.array, b.array);
    return this;
  }

  /**
   * Cross product of self and b, written to a Vector3 out
   * @param out
   * @param b
   */
  cross(out: Vector3, b: Vector2) {
    vec2.cross(out.array, this.array, b.array);
    return this;
  }

  /**
   * Alias for distance
   * @param b {number}
   */
  dist(b: Vector2) {
    return vec2.dist(this.array, b.array);
  }

  /**
   * Distance between self and b
   * @param b {number}
   */
  distance(b: Vector2) {
    return vec2.distance(this.array, b.array);
  }

  /**
   * Alias for divide
   * @param b
   */
  div(b: Vector2) {
    vec2.div(this.array, this.array, b.array);
    return this;
  }

  /**
   * Divide self by b
   * @param b
   */
  divide(b: Vector2) {
    vec2.divide(this.array, this.array, b.array);
    return this;
  }

  /**
   * Dot product of self and b
   * @param b {number}
   */
  dot(b: Vector2) {
    return vec2.dot(this.array, b.array);
  }

  /**
   * Alias of length {number}
   */
  len() {
    return vec2.len(this.array);
  }

  /**
   * Calculate the length {number}
   */
  length() {
    return vec2.length(this.array);
  }

  /**
   * Linear interpolation between a and b
   * @param a
   * @param b
   * @param t
   */
  lerp(a: Vector2, b: Vector2, t: number) {
    vec2.lerp(this.array, a.array, b.array, t);
    return this;
  }

  /**
   * Minimum of self and b
   * @param b
   */
  min(b: Vector2) {
    vec2.min(this.array, this.array, b.array);
    return this;
  }

  /**
   * Maximum of self and b
   * @param b
   */
  max(b: Vector2) {
    vec2.max(this.array, this.array, b.array);
    return this;
  }

  /**
   * Alias for multiply
   * @param b
   */
  mul(b: Vector2) {
    vec2.mul(this.array, this.array, b.array);
    return this;
  }

  /**
   * Mutiply self and b
   * @param b
   */
  multiply(b: Vector2) {
    vec2.multiply(this.array, this.array, b.array);
    return this;
  }

  /**
   * Negate self
   */
  negate() {
    vec2.negate(this.array, this.array);
    return this;
  }

  /**
   * Normalize self
   */
  normalize() {
    vec2.normalize(this.array, this.array);
    return this;
  }

  /**
   * Generate random x, y components with a given scale
   * @param cale
   */
  random(scale: number) {
    vec2.random(this.array, scale);
    return this;
  }

  /**
   * Scale self
   * @param scale
   */
  scale(s: number) {
    vec2.scale(this.array, this.array, s);
    return this;
  }

  /**
   * Scale b and add to self
   * @param b
   * @param scale
   */
  scaleAndAdd(b: Vector2, s: number) {
    vec2.scaleAndAdd(this.array, this.array, b.array, s);
    return this;
  }

  /**
   * Alias for squaredDistance
   * @param b {number}
   */
  sqrDist(b: Vector2) {
    return vec2.sqrDist(this.array, b.array);
  }

  /**
   * Squared distance between self and b
   * @param b {number}
   */
  squaredDistance(b: Vector2) {
    return vec2.squaredDistance(this.array, b.array);
  }

  /**
   * Alias for squaredLength {number}
   */
  sqrLen() {
    return vec2.sqrLen(this.array);
  }

  /**
   * Squared length of self {number}
   */
  squaredLength() {
    return vec2.squaredLength(this.array);
  }

  /**
   * Alias for subtract
   * @param b
   */
  sub(b: Vector2) {
    vec2.sub(this.array, this.array, b.array);
    return this;
  }

  /**
   * Subtract b from self
   * @param b
   */
  subtract(b: Vector2) {
    vec2.subtract(this.array, this.array, b.array);
    return this;
  }

  /**
   * Transform self with a Matrix2 m
   * @param m
   */
  transformMat2(m: Matrix2) {
    vec2.transformMat2(this.array, this.array, m.array);
    return this;
  }

  /**
   * Transform self with a Matrix2d m
   * @param m
   */
  transformMat2d(m: Matrix2d) {
    vec2.transformMat2d(this.array, this.array, m.array);
    return this;
  }

  /**
   * Transform self with a Matrix3 m
   * @param {clay.Matrix3} m
   */
  transformMat3(m: Matrix3) {
    vec2.transformMat3(this.array, this.array, m.array);
    return this;
  }

  /**
   * Transform self with a Matrix4 m
   * @param m
   */
  transformMat4(m: Matrix4) {
    vec2.transformMat4(this.array, this.array, m.array);
    return this;
  }

  toString() {
    return matrixOrVectorClassToString(this, 2);
  }

  toArray() {
    return this.array.slice() as vec2.Vec2Array;
  }

  // Supply methods that are not in place

  /**
   * @param out
   * @param a
   * @param b
   */
  static add(out: Vector2, a: Vector2, b: Vector2) {
    vec2.add(out.array, a.array, b.array);
    return out;
  }

  /**
   * @param out
   * @param x
   * @param y
   */
  static set(out: Vector2, x: number, y: number) {
    vec2.set(out.array, x, y);
    return out;
  }

  /**
   * @param out
   * @param b
   */
  static copy(out: Vector2, b: Vector2) {
    vec2.copy(out.array, b.array);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param b
   */
  static cross(out: Vector3, a: Vector2, b: Vector2) {
    vec2.cross(out.array, a.array, b.array);
    return out;
  }
  /**
   * @param a
   * @param b {number}
   */
  static dist(a: Vector2, b: Vector2) {
    return vec2.distance(a.array, b.array);
  }
  /**
   * @function
   * @param a
   * @param b {number}
   */
  static distance = Vector2.dist;
  /**
   * @param out
   * @param a
   * @param b
   */
  static div(out: Vector2, a: Vector2, b: Vector2) {
    vec2.divide(out.array, a.array, b.array);
    return out;
  }
  /**
   * @function
   * @param out
   * @param a
   * @param b
   */
  static divide = Vector2.div;
  /**
   * @param a
   * @param b {number}
   */
  static dot(a: Vector2, b: Vector2) {
    return vec2.dot(a.array, b.array);
  }

  /**
   * @param a {number}
   */
  static len(b: Vector2) {
    return vec2.length(b.array);
  }

  // Vector2.length = Vector2.len;

  /**
   * @param out
   * @param a
   * @param b
   * @param t
   */
  static lerp(out: Vector2, a: Vector2, b: Vector2, t: number) {
    vec2.lerp(out.array, a.array, b.array, t);
    return out;
  }
  /**
   * @param out
   * @param a
   * @param b
   */
  static min(out: Vector2, a: Vector2, b: Vector2) {
    vec2.min(out.array, a.array, b.array);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param b
   */
  static max(out: Vector2, a: Vector2, b: Vector2) {
    vec2.max(out.array, a.array, b.array);
    return out;
  }
  /**
   * @param out
   * @param a
   * @param b
   */
  static mul(out: Vector2, a: Vector2, b: Vector2) {
    vec2.multiply(out.array, a.array, b.array);
    return out;
  }
  /**
   * @function
   * @param out
   * @param a
   * @param b
   */
  static multiply = Vector2.mul;
  /**
   * @param out
   * @param a
   */
  static negate(out: Vector2, a: Vector2) {
    vec2.negate(out.array, a.array);
    return out;
  }
  /**
   * @param out
   * @param a
   */
  static normalize(out: Vector2, a: Vector2) {
    vec2.normalize(out.array, a.array);
    return out;
  }
  /**
   * @param out
   * @param scale
   */
  static random(out: Vector2, scale: number) {
    vec2.random(out.array, scale);
    return out;
  }
  /**
   * @param out
   * @param a
   * @param scale
   */
  static scale(out: Vector2, a: Vector2, scale: number) {
    vec2.scale(out.array, a.array, scale);
    return out;
  }
  /**
   * @param out
   * @param a
   * @param b
   * @param scale
   */
  static scaleAndAdd(out: Vector2, a: Vector2, b: Vector2, scale: number) {
    vec2.scaleAndAdd(out.array, a.array, b.array, scale);
    return out;
  }
  /**
   * @param a
   * @param b {number}
   */
  static sqrDist(a: Vector2, b: Vector2) {
    return vec2.sqrDist(a.array, b.array);
  }
  /**
   * @function
   * @param a
   * @param b {number}
   */
  static squaredDistance = Vector2.sqrDist;

  /**
   * @param a {number}
   */
  static sqrLen(a: Vector2) {
    return vec2.sqrLen(a.array);
  }
  /**
   * @function
   * @param a
   */
  static squaredLength = Vector2.sqrLen;

  /**
   * @param out
   * @param a
   * @param b
   */
  static sub(out: Vector2, a: Vector2, b: Vector2) {
    vec2.subtract(out.array, a.array, b.array);
    return out;
  }
  /**
   * @function
   * @param out
   * @param a
   * @param b
   */
  static subtract = Vector2.sub;
  /**
   * @param out
   * @param a
   * @param m
   */
  static transformMat2(out: Vector2, a: Vector2, m: Matrix2) {
    vec2.transformMat2(out.array, a.array, m.array);
    return out;
  }
  /**
   * @param out
   * @param a
   * @param m
   */
  static transformMat2d(out: Vector2, a: Vector2, m: Matrix2d) {
    vec2.transformMat2d(out.array, a.array, m.array);
    return out;
  }
  /**
   * @param out
   * @param a
   * @param m
   */
  static transformMat3(out: Vector2, a: Vector2, m: Matrix3) {
    vec2.transformMat3(out.array, a.array, m.array);
    return out;
  }
  /**
   * @param out
   * @param a
   * @param m
   */
  static transformMat4(out: Vector2, a: Vector2, m: Matrix4) {
    vec2.transformMat4(out.array, a.array, m.array);
    return out;
  }
}

export default Vector2;
