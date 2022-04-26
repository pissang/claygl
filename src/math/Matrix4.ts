import * as mat4 from '../glmatrix/mat4';
import * as vec3 from '../glmatrix/vec3';
import * as quat from '../glmatrix/quat';
import * as mat3 from '../glmatrix/mat3';
import { matrixOrVectorClassToString } from './util';
import Vector3 from './Vector3';
import type Quaternion from './Quaternion';
import Matrix2d from './Matrix2d';

const x = vec3.create();
const y = vec3.create();
const z = vec3.create();

const m3 = mat3.create();

class Matrix4 {
  private _axisX = new Vector3();
  private _axisY = new Vector3();
  private _axisZ = new Vector3();

  array = mat4.create();

  /**
   * Set components from array
   * @param arr
   */
  setArray(arr: mat4.Mat4Array) {
    for (let i = 0; i < this.array.length; i++) {
      this.array[i] = arr[i];
    }
    return this;
  }
  /**
   * Calculate the adjugate of self, in-place
   */
  adjoint() {
    mat4.adjoint(this.array, this.array);
    return this;
  }

  /**
   * Clone a new Matrix4
   */
  clone() {
    return new Matrix4().copy(this);
  }

  /**
   * Copy from b
   * @param b
   */
  copy(a: Matrix4) {
    mat4.copy(this.array, a.array);
    return this;
  }

  /**
   * Calculate matrix determinant
   */
  determinant() {
    return mat4.determinant(this.array);
  }

  /**
   * Set upper 3x3 part from quaternion
   * @param q
   */
  fromQuat(q: Quaternion) {
    mat4.fromQuat(this.array, q.array);
    return this;
  }

  /**
   * Set from a quaternion rotation and a vector translation
   * @param q
   * @param v
   */
  fromRotationTranslation(q: Quaternion, v: Vector3) {
    mat4.fromRotationTranslation(this.array, q.array, v.array);
    return this;
  }

  /**
   * Set from Matrix2d, it is used when converting a 2d shape to 3d space.
   * In 3d space it is equivalent to ranslate on xy plane and rotate about z axis
   * @param m2d
   */
  fromMat2d(m2d: Matrix2d) {
    Matrix4.fromMat2d(this, m2d);
    return this;
  }

  /**
   * Set from frustum bounds
   * @param left
   * @param right
   * @param bottom
   * @param top
   * @param near
   * @param far
   */
  frustum(left: number, right: number, bottom: number, top: number, near: number, far: number) {
    mat4.frustum(this.array, left, right, bottom, top, near, far);
    return this;
  }

  /**
   * Set to a identity matrix
   */
  identity() {
    mat4.identity(this.array);
    return this;
  }

  /**
   * Invert self
   */
  invert() {
    mat4.invert(this.array, this.array);
    return this;
  }

  /**
   * Set as a matrix with the given eye position, focal point, and up axis
   * @param eye
   * @param center
   * @param up
   */
  lookAt(eye: Vector3, center: Vector3, up: Vector3) {
    mat4.lookAt(this.array, eye.array, center.array, up.array);
    return this;
  }

  /**
   * Alias for mutiply
   * @param b
   */
  mul(b: Matrix4) {
    mat4.mul(this.array, this.array, b.array);
    return this;
  }

  /**
   * Alias for multiplyLeft
   * @param a
   */
  mulLeft(a: Matrix4) {
    mat4.mul(this.array, a.array, this.array);
    return this;
  }

  /**
   * Multiply self and b
   * @param b
   */
  multiply(b: Matrix4) {
    mat4.multiply(this.array, this.array, b.array);
    return this;
  }

  /**
   * Multiply a and self, a is on the left
   * @param a
   */
  multiplyLeft(a: Matrix4) {
    mat4.multiply(this.array, a.array, this.array);
    return this;
  }

  /**
   * Set as a orthographic projection matrix
   * @param left
   * @param right
   * @param bottom
   * @param top
   * @param near
   * @param far
   */
  ortho(left: number, right: number, bottom: number, top: number, near: number, far: number) {
    mat4.ortho(this.array, left, right, bottom, top, near, far);
    return this;
  }
  /**
   * Set as a perspective projection matrix
   * @param fovy
   * @param aspect
   * @param near
   * @param far
   */
  perspective(fovy: number, aspect: number, near: number, far: number) {
    mat4.perspective(this.array, fovy, aspect, near, far);
    return this;
  }

  /**
   * Rotate self by rad about axis.
   * Equal to right-multiply a rotaion matrix
   * @param rad
   * @param axis
   */
  rotate(rad: number, axis: Vector3) {
    mat4.rotate(this.array, this.array, rad, axis.array);
    return this;
  }

  /**
   * Rotate self by a given radian about X axis.
   * Equal to right-multiply a rotaion matrix
   * @param rad
   */
  rotateX(rad: number) {
    mat4.rotateX(this.array, this.array, rad);
    return this;
  }

  /**
   * Rotate self by a given radian about Y axis.
   * Equal to right-multiply a rotaion matrix
   * @param rad
   */
  rotateY(rad: number) {
    mat4.rotateY(this.array, this.array, rad);
    return this;
  }

  /**
   * Rotate self by a given radian about Z axis.
   * Equal to right-multiply a rotaion matrix
   * @param rad
   */
  rotateZ(rad: number) {
    mat4.rotateZ(this.array, this.array, rad);
    return this;
  }

  /**
   * Scale self by s
   * Equal to right-multiply a scale matrix
   * @param s
   */
  scale(v: Vector3) {
    mat4.scale(this.array, this.array, v.array);
    return this;
  }

  /**
   * Translate self by v.
   * Equal to right-multiply a translate matrix
   * @param v
   */
  translate(v: Vector3) {
    mat4.translate(this.array, this.array, v.array);
    return this;
  }

  /**
   * Transpose self, in-place.
   */
  transpose() {
    mat4.transpose(this.array, this.array);
    return this;
  }

  /**
   * Decompose a matrix to SRT
   * @param scale
   * @param rotation
   * @param position
   * @see http://msdn.microsoft.com/en-us/library/microsoft.xna.framework.matrix.decompose.aspx
   */
  decomposeMatrix(scale: Vector3 | undefined, rotation: Quaternion, position: Vector3) {
    const el = this.array;
    vec3.set(x, el[0], el[1], el[2]);
    vec3.set(y, el[4], el[5], el[6]);
    vec3.set(z, el[8], el[9], el[10]);

    let sx = vec3.length(x);
    const sy = vec3.length(y);
    const sz = vec3.length(z);

    // if determine is negative, we need to invert one scale
    const det = this.determinant();
    if (det < 0) {
      sx = -sx;
    }

    if (scale) {
      scale.set(sx, sy, sz);
    }

    position.set(el[12], el[13], el[14]);

    mat3.fromMat4(m3, el);
    // Not like mat4, mat3 in glmatrix seems to be row-based
    // Seems fixed in gl-matrix 2.2.2
    // https://github.com/toji/gl-matrix/issues/114
    // mat3.transpose(m3, m3);

    m3[0] /= sx;
    m3[1] /= sx;
    m3[2] /= sx;

    m3[3] /= sy;
    m3[4] /= sy;
    m3[5] /= sy;

    m3[6] /= sz;
    m3[7] /= sz;
    m3[8] /= sz;

    quat.fromMat3(rotation.array, m3);
    quat.normalize(rotation.array, rotation.array);
  }

  /**
   * Z Axis of local transform
   * @name z
   * @type {clay.Vector3}
   * @memberOf clay.Matrix4
   * @instance
   */
  get z() {
    const el = this.array;
    this._axisZ.set(el[8], el[9], el[10]);
    return this._axisZ;
  }
  set z(v: Vector3) {
    // TODO Here has a problem
    // If only set an item of vector will not work
    const el = this.array;
    const arr = v.array;
    el[8] = arr[0];
    el[9] = arr[1];
    el[10] = arr[2];
  }

  /**
   * Y Axis of local transform
   * @name y
   * @type {clay.Vector3}
   * @memberOf clay.Matrix4
   * @instance
   */
  get y() {
    const el = this.array;
    this._axisY.set(el[4], el[5], el[6]);
    return this._axisY;
  }
  set y(v: Vector3) {
    const el = this.array;
    const arr = v.array;
    el[4] = arr[0];
    el[5] = arr[1];
    el[6] = arr[2];
  }

  /**
   * X Axis of local transform
   * @name x
   * @type {clay.Vector3}
   * @memberOf clay.Matrix4
   * @instance
   */
  get x() {
    const el = this.array;
    this._axisX.set(el[0], el[1], el[2]);
    return this._axisX;
  }
  set x(v: Vector3) {
    const el = this.array;
    const arr = v.array;
    el[0] = arr[0];
    el[1] = arr[1];
    el[2] = arr[2];
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
   */
  static adjoint(out: Matrix4, a: Matrix4) {
    mat4.adjoint(out.array, a.array);
    return out;
  }

  /**
   * @param out
   * @param a
   */
  static copy(out: Matrix4, a: Matrix4) {
    mat4.copy(out.array, a.array);
    return out;
  }

  /**
   * @param a
   */
  static determinant(a: Matrix4) {
    return mat4.determinant(a.array);
  }

  /**
   * @param out
   */
  static identity(out: Matrix4) {
    mat4.identity(out.array);
    return out;
  }

  /**
   * @param out
   * @param left
   * @param right
   * @param bottom
   * @param top
   * @param near
   * @param far
   */
  static ortho(
    out: Matrix4,
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number
  ) {
    mat4.ortho(out.array, left, right, bottom, top, near, far);
    return out;
  }

  /**
   * @param out
   * @param fovy
   * @param aspect
   * @param near
   * @param far
   */
  static perspective(out: Matrix4, fovy: number, aspect: number, near: number, far: number) {
    mat4.perspective(out.array, fovy, aspect, near, far);
    return out;
  }

  /**
   * @param out
   * @param eye
   * @param center
   * @param up
   */
  static lookAt(out: Matrix4, eye: Vector3, center: Vector3, up: Vector3) {
    mat4.lookAt(out.array, eye.array, center.array, up.array);
    return out;
  }

  /**
   * @param out
   * @param a
   */
  static invert(out: Matrix4, a: Matrix4) {
    mat4.invert(out.array, a.array);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param b
   */
  static mul(out: Matrix4, a: Matrix4, b: Matrix4) {
    mat4.mul(out.array, a.array, b.array);
    return out;
  }

  /**
   * @function
   * @param out
   * @param a
   * @param b
   */
  static multiply = Matrix4.mul;

  /**
   * @param out
   * @param q
   */
  static fromQuat(out: Matrix4, q: Quaternion) {
    mat4.fromQuat(out.array, q.array);
    return out;
  }

  /**
   * @param out
   * @param q
   * @param v
   */
  static fromRotationTranslation(out: Matrix4, q: Quaternion, v: Vector3) {
    mat4.fromRotationTranslation(out.array, q.array, v.array);
    return out;
  }

  /**
   * @param m4
   * @param m2d
   */
  static fromMat2d(m4: Matrix4, m2d: Matrix2d) {
    const m2da = m2d.array;
    const m4a = m4.array;

    m4a[0] = m2da[0];
    m4a[4] = m2da[2];
    m4a[12] = m2da[4];

    m4a[1] = m2da[1];
    m4a[5] = m2da[3];
    m4a[13] = m2da[5];

    return m4;
  }

  /**
   * @param out
   * @param a
   * @param rad
   * @param axis
   */
  static rotate(out: Matrix4, a: Matrix4, rad: number, axis: Vector3) {
    mat4.rotate(out.array, a.array, rad, axis.array);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param rad
   */
  static rotateX(out: Matrix4, a: Matrix4, rad: number) {
    mat4.rotateX(out.array, a.array, rad);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param rad
   */
  static rotateY(out: Matrix4, a: Matrix4, rad: number) {
    mat4.rotateY(out.array, a.array, rad);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param rad
   */
  static rotateZ(out: Matrix4, a: Matrix4, rad: number) {
    mat4.rotateZ(out.array, a.array, rad);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param v
   */
  static scale(out: Matrix4, a: Matrix4, v: Vector3) {
    mat4.scale(out.array, a.array, v.array);
    return out;
  }

  /**
   * @param out
   * @param a
   */
  static transpose(out: Matrix4, a: Matrix4) {
    mat4.transpose(out.array, a.array);
    return out;
  }

  /**
   * @param out
   * @param a
   * @param v
   */
  static translate(out: Matrix4, a: Matrix4, v: Vector3) {
    mat4.translate(out.array, a.array, v.array);
    return out;
  }
}

export default Matrix4;
