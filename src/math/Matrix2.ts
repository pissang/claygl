import * as mat2 from '../glmatrix/mat2';
import { matrixOrVectorClassToString } from './util';
import type Vector2 from './Vector2';

class Matrix2 {
  /**
   * Storage of Matrix2
   */
  array = mat2.create();
  constructor() {}

  /**
   * Set components from array
   * @param arr
   */
  setArray(arr: mat2.Mat2Array) {
    for (let i = 0; i < this.array.length; i++) {
      this.array[i] = arr[i];
    }
    return this;
  }
  /**
   * Clone a new Matrix2
   */
  clone() {
    return new Matrix2().copy(this);
  }

  /**
   * Copy from b
   * @param b
   */
  copy(b: Matrix2) {
    mat2.copy(this.array, b.array);
    return this;
  }

  /**
   * Calculate the adjugate of self, in-place
   */
  adjoint() {
    mat2.adjoint(this.array, this.array);
    return this;
  }

  /**
   * Calculate matrix determinant
   */
  determinant() {
    return mat2.determinant(this.array);
  }

  /**
   * Set to a identity matrix
   */
  identity() {
    mat2.identity(this.array);
    return this;
  }

  /**
   * Invert self
   */
  invert() {
    mat2.invert(this.array, this.array);
    return this;
  }

  /**
   * Alias for mutiply
   * @param b
   */
  mul(b: Matrix2) {
    mat2.mul(this.array, this.array, b.array);
    return this;
  }

  /**
   * Alias for multiplyLeft
   * @param a
   */
  mulLeft(a: Matrix2) {
    mat2.mul(this.array, a.array, this.array);
    return this;
  }

  /**
   * Multiply self and b
   * @param b
   */
  multiply(b: Matrix2) {
    mat2.multiply(this.array, this.array, b.array);
    return this;
  }

  /**
   * Multiply a and self, a is on the left
   * @param a
   */
  multiplyLeft(a: Matrix2) {
    mat2.multiply(this.array, a.array, this.array);
    return this;
  }

  /**
   * Rotate self by a given radian
   * @param {number}   rad
   */
  rotate(rad: number) {
    mat2.rotate(this.array, this.array, rad);
    return this;
  }

  /**
   * Scale self by s
   * @param s
   */
  scale(v: Vector2) {
    mat2.scale(this.array, this.array, v.array);
    return this;
  }
  /**
   * Transpose self, in-place.
   */
  transpose() {
    mat2.transpose(this.array, this.array);
    return this;
  }

  toString() {
    return matrixOrVectorClassToString(this, 2);
  }

  toArray() {
    return Array.prototype.slice.call(this.array);
  }

  /**
   * @param out
   * @param a
   */
  static adjoint(out: Matrix2, a: Matrix2) {
    mat2.adjoint(out.array, a.array);
    return out;
  }

  /**
   * @param out
   * @param a
   */
  static copy(out: Matrix2, a: Matrix2) {
    mat2.copy(out.array, a.array);
    return out;
  }

  /**
   * @param a
   */
  static determinant(a: Matrix2) {
    return mat2.determinant(a.array);
  }

  /**
   * @param out
   */
  static identity(out: Matrix2) {
    mat2.identity(out.array);
    return out;
  }

  /**
   * @param out
   * @param a
   */
  static invert(out: Matrix2, a: Matrix2) {
    mat2.invert(out.array, a.array);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param b
   */
  static mul(out: Matrix2, a: Matrix2, b: Matrix2) {
    mat2.mul(out.array, a.array, b.array);
    return out;
  }

  /**
   * @function
   * @param out
   * @param a
   * @param b
   */
  static multiply = Matrix2.mul;

  /**
   * @param out
   * @param a
   * @param {number}   rad
   */
  static rotate(out: Matrix2, a: Matrix2, rad: number) {
    mat2.rotate(out.array, a.array, rad);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param v
   */
  static scale(out: Matrix2, a: Matrix2, v: Vector2) {
    mat2.scale(out.array, a.array, v.array);
    return out;
  }
  /**
   * @param out
   * @param a
   */
  static transpose(out: Matrix2, a: Matrix2) {
    mat2.transpose(out.array, a.array);
    return out;
  }
}

export default Matrix2;
