import { Vector3 } from './Vector3';
import { Quaternion } from './Quaternion';
import { Matrix3 } from './Matrix3';

export class Matrix4 {

    array: ArrayLike;

    forward: Vector3;

    up: Vector3;

    right: Vector3;

    adjoint(): Matrix4;

    clone(): Matrix4;

    copy(a: Matrix4): Matrix4;

    determinant(): number;

    fromQuat(q: Quaternion): Matrix4;

    fromRotationTranslation(q: Quaternion, v: Vector3): Matrix4;

    frustum(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4;

    identity(): Matrix4;

    invert(): Matrix4;

    lookAt(eye: Vector3, center: Vector3, up: Vector3): Matrix4;

    mul(b: Matrix4): Matrix4;

    mulLeft(a: Matrix4): Matrix4;

    multiply(b: Matrix4): Matrix4;

    multiplyLeft(a: Matrix4): Matrix4;

    ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4;

    perspective(fovy: number, aspect: number, near: number, far: number): Matrix4;

    rotate(rad: number, axis: Vector3): Matrix4;

    rotateX(rad: number): Matrix4;

    rotateY(rad: number): Matrix4;

    rotateZ(rad: number): Matrix4;

    scale(v: Vector3): Matrix4;

    translate(v: Vector3): Matrix4;

    transpose(): Matrix4;

    decomposeMatrix(scale: Vector3, rotation: Quaternion, position: Vector3): void;

    static adjoint(out: Matrix4, a: Matrix4): Matrix4;

    static copy(out: Matrix4, a: Matrix4): Matrix4;

    static determinant(a: Matrix4): number;

    static fromQuat(out: Matrix4, q: Quaternion): Matrix4;

    static fromRotationTranslation(out: Matrix4, q: Quaternion, v: Vector3): Matrix4;

    static identity(out: Matrix4): Matrix4;

    static invert(out: Matrix4, a: Matrix4): Matrix4;

    static lookAt(out: Matrix4, eye: Vector3, center: Vector3, up: Vector3): Matrix4;

    static mul(out: Matrix4, a: Matrix4, b: Matrix4): Matrix4;

    static multiply(out: Matrix4, a: Matrix4, b: Matrix4): Matrix4;

    static ortho(out: Matrix4, left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4;

    static perspective(out: Matrix4, fovy: number, aspect: number, near: number, far: number): Matrix4;

    static rotate(out: Matrix4, a: Matrix4, rad: number, axis: Vector3): Matrix4;

    static rotateX(out: Matrix4, a: Matrix4, rad: number): Matrix4;

    static rotateY(out: Matrix4, a: Matrix4, rad: number): Matrix4;

    static rotateZ(out: Matrix4, a: Matrix4, rad: number): Matrix4;

    static scale(out: Matrix4, a: Matrix4, v: Vector3): Matrix4;

    static translate(out: Matrix4, a: Matrix4, v: Vector3): Matrix4;

    static transpose(out: Matrix4, a: Matrix4): Matrix4;

}