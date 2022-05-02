import * as mat3 from '../glmatrix/mat3';
import type Matrix2d from './Matrix2d';
import type Matrix4 from './Matrix4';
import type Quaternion from './Quaternion';
import { matrixOrVectorClassToString } from './util';
import type Vector2 from './Vector2';

class Matrix3 {
  /**
   * Storage of Matrix3
   */
  array = mat3.create();
  constructor() {}

  /**
   * Set components from array
   */
  setArray(arr: mat3.Mat3Array) {
    for (let i = 0; i < this.array.length; i++) {
      this.array[i] = arr[i];
    }
    return this;
  }
  /**
   * Calculate the adjugate of self, in-place
   */
  adjoint() {
    mat3.adjoint(this.array, this.array);
    return this;
  }

  /**
   * Clone a new Matrix3
   */
  clone() {
    return new Matrix3().copy(this);
  }

  /**
   * Copy from b
   * @param b
   */
  copy(b: Matrix3) {
    mat3.copy(this.array, b.array);
    return this;
  }

  /**
   * Calculate matrix determinant
   */
  determinant() {
    return mat3.determinant(this.array);
  }

  /**
   * Copy the values from Matrix2d a
   * @param a
   */
  fromMat2d(a: Matrix2d) {
    mat3.fromMat2d(this.array, a.array);
    return this;
  }

  /**
   * Copies the upper-left 3x3 values of Matrix4
   * @param a
   */
  fromMat4(a: Matrix4) {
    mat3.fromMat4(this.array, a.array);
    return this;
  }

  /**
   * Calculates a rotation matrix from the given quaternion
   * @param q
   */
  fromQuat(q: Quaternion) {
    mat3.fromQuat(this.array, q.array);
    return this;
  }

  /**
   * Set to a identity matrix
   */
  identity() {
    mat3.identity(this.array);
    return this;
  }

  /**
   * Invert self
   */
  invert() {
    mat3.invert(this.array, this.array);
    return this;
  }

  /**
   * Alias for mutiply
   * @param b
   */
  mul(b: Matrix3) {
    mat3.mul(this.array, this.array, b.array);
    return this;
  }

  /**
   * Alias for multiplyLeft
   * @param a
   */
  mulLeft(a: Matrix3) {
    mat3.mul(this.array, a.array, this.array);
    return this;
  }

  /**
   * Multiply self and b
   * @param b
   */
  multiply(b: Matrix3) {
    mat3.multiply(this.array, this.array, b.array);
    return this;
  }

  /**
   * Multiply a and self, a is on the left
   * @param a
   */
  multiplyLeft(a: Matrix3) {
    mat3.multiply(this.array, a.array, this.array);
    return this;
  }

  /**
   * Rotate self by a given radian
   * @param rad
   */
  rotate(rad: number) {
    mat3.rotate(this.array, this.array, rad);
    return this;
  }

  /**
   * Scale self by s
   * @param v
   */
  scale(v: Vector2) {
    mat3.scale(this.array, this.array, v.array);
    return this;
  }

  /**
   * Translate self by v
   * @param v
   */
  translate(v: Vector2) {
    mat3.translate(this.array, this.array, v.array);
    return this;
  }
  /**
   * Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
   * @param a
   */
  normalFromMat4(a: Matrix4) {
    mat3.normalFromMat4(this.array, a.array);
    return this;
  }

  /**
   * Transpose self, in-place.
   */
  transpose() {
    mat3.transpose(this.array, this.array);
    return this;
  }

  toString() {
    return matrixOrVectorClassToString(this, 3);
  }

  toArray() {
    return this.array.slice() as mat3.Mat3Array;
  }

  /**
   * @param out
   * @param a
   */
  static adjoint(out: Matrix3, a: Matrix3) {
    mat3.adjoint(out.array, a.array);
    return out;
  }

  /**
   * @param out
   * @param a
   */
  static copy(out: Matrix3, a: Matrix3) {
    mat3.copy(out.array, a.array);
    return out;
  }

  /**
   * @param a
   */
  static determinant(a: Matrix3) {
    return mat3.determinant(a.array);
  }

  /**
   * @param out
   */
  static identity(out: Matrix3) {
    mat3.identity(out.array);
    return out;
  }

  /**
   * @param out
   * @param a
   */
  static invert(out: Matrix3, a: Matrix3) {
    mat3.invert(out.array, a.array);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param b
   */
  static mul(out: Matrix3, a: Matrix3, b: Matrix3) {
    mat3.mul(out.array, a.array, b.array);
    return out;
  }

  /**
   * @function
   * @param out
   * @param a
   * @param b
   */
  static multiply = Matrix3.mul;

  /**
   * @param out
   * @param a
   */
  static fromMat2d(out: Matrix3, a: Matrix2d) {
    mat3.fromMat2d(out.array, a.array);
    return out;
  }

  /**
   * @param out
   * @param a
   */
  static fromMat4(out: Matrix3, a: Matrix4) {
    mat3.fromMat4(out.array, a.array);
    return out;
  }

  /**
   * @param out
   * @param a
   */
  static fromQuat(out: Matrix3, q: Quaternion) {
    mat3.fromQuat(out.array, q.array);
    return out;
  }

  /**
   * @param out
   * @param a
   */
  static normalFromMat4(out: Matrix3, a: Matrix4) {
    mat3.normalFromMat4(out.array, a.array);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param rad
   */
  static rotate(out: Matrix3, a: Matrix3, rad: number) {
    mat3.rotate(out.array, a.array, rad);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param v
   */
  static scale(out: Matrix3, a: Matrix3, v: Vector2) {
    mat3.scale(out.array, a.array, v.array);
    return out;
  }

  /**
   * @param out
   * @param a
   */
  static transpose(out: Matrix3, a: Matrix3) {
    mat3.transpose(out.array, a.array);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param v
   */
  static translate(out: Matrix3, a: Matrix3, v: Vector2) {
    mat3.translate(out.array, a.array, v.array);
    return out;
  }
}

export default Matrix3;
