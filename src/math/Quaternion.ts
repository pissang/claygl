import * as quat from '../glmatrix/quat';
import * as mat3 from '../glmatrix/mat3';
import type Matrix3 from './Matrix3';
import type Matrix4 from './Matrix4';
import Vector3, { RotateOrder } from './Vector3';
import { matrixOrVectorClassToString } from './util';

const m3 = mat3.create();
class Quaternion {
  /**
   * Storage of Quaternion, read and write of x, y, z, w will change the values in array
   * All methods also operate on the array instead of x, y, z, w components
   */
  array: quat.QuatArray;
  constructor(x?: number, y?: number, z?: number, w?: number) {
    x = x || 0;
    y = y || 0;
    z = z || 0;
    w = w === undefined ? 1 : w;

    this.array = quat.fromValues(x, y, z, w);
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
  add(b: Quaternion) {
    quat.add(this.array, this.array, b.array);
    return this;
  }

  /**
   * Calculate the w component from x, y, z component
   */
  calculateW() {
    quat.calculateW(this.array, this.array);
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
   * @param arr
   */
  setArray(arr: quat.QuatArray) {
    const thisArr = this.array;
    thisArr[0] = arr[0];
    thisArr[1] = arr[1];
    thisArr[2] = arr[2];
    thisArr[3] = arr[3];

    return this;
  }

  /**
   * Clone a new Quaternion
   */
  clone() {
    return new Quaternion(this.x, this.y, this.z, this.w);
  }

  /**
   * Calculates the conjugate of self If the quaternion is normalized,
   * this function is faster than invert and produces the same result.
   *
   */
  conjugate() {
    quat.conjugate(this.array, this.array);
    return this;
  }

  /**
   * Copy from b
   * @param b
   */
  copy(b: Quaternion) {
    quat.copy(this.array, b.array);
    return this;
  }

  /**
   * Dot product of self and b
   * @param b
   */
  dot(b: Quaternion) {
    return quat.dot(this.array, b.array);
  }

  /**
   * Set from the given 3x3 rotation matrix
   * @param m
   */
  fromMat3(m: Matrix3) {
    quat.fromMat3(this.array, m.array);
    return this;
  }

  /**
   * Set from the given 4x4 rotation matrix
   * The 4th column and 4th row will be droped
   * @param m
   */
  fromMat4(m: Matrix4) {
    mat3.fromMat4(m3, m.array);
    // TODO Not like mat4, mat3 in glmatrix seems to be row-based
    mat3.transpose(m3, m3);
    quat.fromMat3(this.array, m3);
    return this;
  }

  /**
   * Set to identity quaternion
   */
  identity() {
    quat.identity(this.array);
    return this;
  }
  /**
   * Invert self
   */
  invert() {
    quat.invert(this.array, this.array);
    return this;
  }
  /**
   * Alias of length
   */
  len() {
    return quat.len(this.array);
  }

  /**
   * Calculate the length
   */
  length() {
    return quat.length(this.array);
  }

  /**
   * Linear interpolation between a and b
   * @param a
   * @param b
   * @param t
   */
  lerp(a: Quaternion, b: Quaternion, t: number) {
    quat.lerp(this.array, a.array, b.array, t);
    return this;
  }

  /**
   * Alias for multiply
   * @param b
   */
  mul(b: Quaternion) {
    quat.mul(this.array, this.array, b.array);
    return this;
  }

  /**
   * Alias for multiplyLeft
   * @param a
   */
  mulLeft(a: Quaternion) {
    quat.multiply(this.array, a.array, this.array);
    return this;
  }

  /**
   * Mutiply self and b
   * @param b
   */
  multiply(b: Quaternion) {
    quat.multiply(this.array, this.array, b.array);
    return this;
  }

  /**
   * Mutiply a and self
   * Quaternion mutiply is not commutative, so the result of mutiplyLeft is different with multiply.
   * @param a
   */
  multiplyLeft(a: Quaternion) {
    quat.multiply(this.array, a.array, this.array);
    return this;
  }

  /**
   * Normalize self
   */
  normalize() {
    quat.normalize(this.array, this.array);
    return this;
  }

  /**
   * Rotate self by a given radian about X axis
   * @param rad
   */
  rotateX(rad: number) {
    quat.rotateX(this.array, this.array, rad);
    return this;
  }

  /**
   * Rotate self by a given radian about Y axis
   * @param rad
   */
  rotateY(rad: number) {
    quat.rotateY(this.array, this.array, rad);
    return this;
  }

  /**
   * Rotate self by a given radian about Z axis
   * @param rad
   */
  rotateZ(rad: number) {
    quat.rotateZ(this.array, this.array, rad);
    return this;
  }

  /**
   * Sets self to represent the shortest rotation from Vector3 a to Vector3 b.
   * a and b needs to be normalized
   * @param a
   * @param b
   */
  rotationTo(a: Vector3, b: Vector3) {
    quat.rotationTo(this.array, a.array, b.array);
    return this;
  }
  /**
   * Sets self with values corresponding to the given axes
   * @param view
   * @param right
   * @param up
   */
  setAxes(view: Vector3, right: Vector3, up: Vector3) {
    quat.setAxes(this.array, view.array, right.array, up.array);
    return this;
  }

  /**
   * Sets self with a rotation axis and rotation angle
   * @param axis
   * @param rad
   */
  setAxisAngle(axis: Vector3, rad: number) {
    quat.setAxisAngle(this.array, axis.array, rad);
    return this;
  }
  /**
   * Perform spherical linear interpolation between a and b
   * @param a
   * @param b
   * @param t
   */
  slerp(a: Quaternion, b: Quaternion, t: number) {
    quat.slerp(this.array, a.array, b.array, t);
    return this;
  }

  /**
   * Alias for squaredLength
   */
  sqrLen() {
    return quat.sqrLen(this.array);
  }

  /**
   * Squared length of self
   */
  squaredLength() {
    return quat.squaredLength(this.array);
  }

  /**
   * Set from euler
   * @param v
   * @param order
   */
  fromEuler(v: Vector3, order: RotateOrder) {
    return Quaternion.fromEuler(this, v, order);
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
  static add(out: Quaternion, a: Quaternion, b: Quaternion) {
    quat.add(out.array, a.array, b.array);
    return out;
  }

  /**
   * @param out
   * @param x
   * @param y
   * @param z
   * @param w
   */
  static set(out: Quaternion, x: number, y: number, z: number, w: number) {
    quat.set(out.array, x, y, z, w);
  }

  /**
   * @param out
   * @param b
   */
  static copy(out: Quaternion, b: Quaternion) {
    quat.copy(out.array, b.array);
    return out;
  }

  /**
   * @param out
   * @param a
   */
  static calculateW(out: Quaternion, a: Quaternion) {
    quat.calculateW(out.array, a.array);
    return out;
  }

  /**
   * @param out
   * @param a
   */
  static conjugate(out: Quaternion, a: Quaternion) {
    quat.conjugate(out.array, a.array);
    return out;
  }

  /**
   * @param out
   */
  static identity(out: Quaternion) {
    quat.identity(out.array);
    return out;
  }

  /**
   * @param out
   * @param a
   */
  static invert(out: Quaternion, a: Quaternion) {
    quat.invert(out.array, a.array);
    return out;
  }

  /**
   * @param a
   * @param b
   */
  static dot(a: Quaternion, b: Quaternion) {
    return quat.dot(a.array, b.array);
  }

  /**
   * @param a
   */
  static len(a: Quaternion) {
    return quat.length(a.array);
  }

  // Quaternion.length = Quaternion.len;

  /**
   * @param out
   * @param a
   * @param b
   * @param t
   */
  static lerp(out: Quaternion, a: Quaternion, b: Quaternion, t: number) {
    quat.lerp(out.array, a.array, b.array, t);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param b
   * @param t
   */
  static slerp(out: Quaternion, a: Quaternion, b: Quaternion, t: number) {
    quat.slerp(out.array, a.array, b.array, t);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param b
   */
  static mul(out: Quaternion, a: Quaternion, b: Quaternion) {
    quat.multiply(out.array, a.array, b.array);
    return out;
  }

  /**
   * @function
   * @param out
   * @param a
   * @param b
   */
  static multiply = Quaternion.mul;

  /**
   * @param out
   * @param a
   * @param rad
   */
  static rotateX(out: Quaternion, a: Quaternion, rad: number) {
    quat.rotateX(out.array, a.array, rad);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param rad
   */
  static rotateY(out: Quaternion, a: Quaternion, rad: number) {
    quat.rotateY(out.array, a.array, rad);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param rad
   */
  static rotateZ(out: Quaternion, a: Quaternion, rad: number) {
    quat.rotateZ(out.array, a.array, rad);
    return out;
  }

  /**
   * @param out
   * @param axis
   * @param rad
   */
  static setAxisAngle(out: Quaternion, axis: Vector3, rad: number) {
    quat.setAxisAngle(out.array, axis.array, rad);
    return out;
  }

  /**
   * @param out
   * @param a
   */
  static normalize(out: Quaternion, a: Quaternion) {
    quat.normalize(out.array, a.array);
    return out;
  }

  /**
   * @param a
   */
  static sqrLen(a: Quaternion) {
    return quat.sqrLen(a.array);
  }

  /**
   * @function
   * @param a
   */
  static squaredLength = Quaternion.sqrLen;

  /**
   * @param out
   * @param m
   */
  static fromMat3(out: Quaternion, m: Matrix3) {
    quat.fromMat3(out.array, m.array);
    return out;
  }

  /**
   * @param out
   * @param view
   * @param right
   * @param up
   */
  static setAxes(out: Quaternion, view: Vector3, right: Vector3, up: Vector3) {
    quat.setAxes(out.array, view.array, right.array, up.array);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param b
   */
  static rotationTo(out: Quaternion, a: Vector3, b: Vector3) {
    quat.rotationTo(out.array, a.array, b.array);
    return out;
  }

  /**
   * Set quaternion from euler
   * @param out
   * @param v
   * @param order
   */
  static fromEuler(out: Quaternion, v: Vector3, order: RotateOrder) {
    const arr = v.array;
    const target = out.array;
    const c1 = Math.cos(arr[0] / 2);
    const c2 = Math.cos(arr[1] / 2);
    const c3 = Math.cos(arr[2] / 2);
    const s1 = Math.sin(arr[0] / 2);
    const s2 = Math.sin(arr[1] / 2);
    const s3 = Math.sin(arr[2] / 2);

    order = (order || 'XYZ').toUpperCase() as RotateOrder;

    // http://www.mathworks.com/matlabcentral/fileexchange/
    //  20696-function-to-convert-between-dcm-euler-angles-quaternions-and-euler-vectors/
    //  content/SpinCalc.m

    switch (order) {
      case 'XYZ':
        target[0] = s1 * c2 * c3 + c1 * s2 * s3;
        target[1] = c1 * s2 * c3 - s1 * c2 * s3;
        target[2] = c1 * c2 * s3 + s1 * s2 * c3;
        target[3] = c1 * c2 * c3 - s1 * s2 * s3;
        break;
      case 'YXZ':
        target[0] = s1 * c2 * c3 + c1 * s2 * s3;
        target[1] = c1 * s2 * c3 - s1 * c2 * s3;
        target[2] = c1 * c2 * s3 - s1 * s2 * c3;
        target[3] = c1 * c2 * c3 + s1 * s2 * s3;
        break;
      case 'ZXY':
        target[0] = s1 * c2 * c3 - c1 * s2 * s3;
        target[1] = c1 * s2 * c3 + s1 * c2 * s3;
        target[2] = c1 * c2 * s3 + s1 * s2 * c3;
        target[3] = c1 * c2 * c3 - s1 * s2 * s3;
        break;
      case 'ZYX':
        target[0] = s1 * c2 * c3 - c1 * s2 * s3;
        target[1] = c1 * s2 * c3 + s1 * c2 * s3;
        target[2] = c1 * c2 * s3 - s1 * s2 * c3;
        target[3] = c1 * c2 * c3 + s1 * s2 * s3;
        break;
      case 'YZX':
        target[0] = s1 * c2 * c3 + c1 * s2 * s3;
        target[1] = c1 * s2 * c3 + s1 * c2 * s3;
        target[2] = c1 * c2 * s3 - s1 * s2 * c3;
        target[3] = c1 * c2 * c3 - s1 * s2 * s3;
        break;
      case 'XZY':
        target[0] = s1 * c2 * c3 - c1 * s2 * s3;
        target[1] = c1 * s2 * c3 - s1 * c2 * s3;
        target[2] = c1 * c2 * s3 + s1 * s2 * c3;
        target[3] = c1 * c2 * c3 + s1 * s2 * s3;
        break;
    }
  }
}

export default Quaternion;
