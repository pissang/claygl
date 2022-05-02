import * as mat2d from '../glmatrix/mat2d';
import { matrixOrVectorClassToString } from './util';
import type Vector2 from './Vector2';

class Matrix2d {
  array = mat2d.create();

  /**
   * Set components from array
   * @param arr
   */
  setArray(arr: mat2d.Mat2dArray) {
    for (let i = 0; i < this.array.length; i++) {
      this.array[i] = arr[i];
    }
    return this;
  }
  /**
   * Clone a new Matrix2d
   */
  clone() {
    return new Matrix2d().copy(this);
  }

  /**
   * Copy from b
   * @param b
   */
  copy(b: Matrix2d) {
    mat2d.copy(this.array, b.array);
    return this;
  }

  /**
   * Calculate matrix determinant
   */
  determinant() {
    return mat2d.determinant(this.array);
  }

  /**
   * Set to a identity matrix
   */
  identity() {
    mat2d.identity(this.array);
    return this;
  }

  /**
   * Invert self
   */
  invert() {
    mat2d.invert(this.array, this.array);
    return this;
  }

  /**
   * Alias for mutiply
   * @param b
   */
  mul(b: Matrix2d) {
    mat2d.mul(this.array, this.array, b.array);
    return this;
  }

  /**
   * Alias for multiplyLeft
   * @param a
   */
  mulLeft(b: Matrix2d) {
    mat2d.mul(this.array, b.array, this.array);
    return this;
  }

  /**
   * Multiply self and b
   * @param b
   */
  multiply(b: Matrix2d) {
    mat2d.multiply(this.array, this.array, b.array);
    return this;
  }

  /**
   * Multiply a and self, a is on the left
   * @param a
   */
  multiplyLeft(b: Matrix2d) {
    mat2d.multiply(this.array, b.array, this.array);
    return this;
  }

  /**
   * Rotate self by a given radian
   * @param {number}   rad
   */
  rotate(rad: number) {
    mat2d.rotate(this.array, this.array, rad);
    return this;
  }

  /**
   * Scale self by s
   * @param {clay.Vector2}  s
   */
  scale(s: Vector2) {
    mat2d.scale(this.array, this.array, s.array);
    return this;
  }

  /**
   * Translate self by v
   * @param {clay.Vector2}  v
   */
  translate(v: Vector2) {
    mat2d.translate(this.array, this.array, v.array);
    return this;
  }

  toString() {
    return matrixOrVectorClassToString(this, 3);
  }

  toArray() {
    return this.array.slice() as mat2d.Mat2dArray;
  }

  /**
   * @param out
   * @param a
   */
  static copy(out: Matrix2d, a: Matrix2d) {
    mat2d.copy(out.array, a.array);
    return out;
  }

  /**
   * @param a
   */
  static determinant(a: Matrix2d) {
    return mat2d.determinant(a.array);
  }

  /**
   * @param out
   */
  static identity(out: Matrix2d) {
    mat2d.identity(out.array);
    return out;
  }

  /**
   * @param out
   * @param a
   */
  static invert(out: Matrix2d, a: Matrix2d) {
    mat2d.invert(out.array, a.array);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param b
   */
  static mul(out: Matrix2d, a: Matrix2d, b: Matrix2d) {
    mat2d.mul(out.array, a.array, b.array);
    return out;
  }

  /**
   * @function
   * @param out
   * @param a
   * @param b
   */
  static multiply = Matrix2d.mul;

  /**
   * @param out
   * @param a
   * @param {number}   rad
   */
  static rotate(out: Matrix2d, a: Matrix2d, rad: number) {
    mat2d.rotate(out.array, a.array, rad);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param {clay.Vector2}  v
   */
  static scale(out: Matrix2d, a: Matrix2d, v: Vector2) {
    mat2d.scale(out.array, a.array, v.array);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param {clay.Vector2}  v
   */
  static translate(out: Matrix2d, a: Matrix2d, v: Vector2) {
    mat2d.translate(out.array, a.array, v.array);
    return out;
  }
}

export default Matrix2d;
