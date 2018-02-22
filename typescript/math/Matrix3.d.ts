import { Quaternion } from './Quaternion';
import { Vector2 } from './Vector2';
import { Matrix2d } from './Matrix2d';
import { Matrix4 } from './Matrix4';

export class Matrix3 {

    array: ArrayLike;

    clone(): Matrix3;

    copy(b: Matrix3): Matrix3;

    adjoint(): Matrix3;

    determinant(): number;

    fromMat2d(a: Matrix2d): Matrix3;

    fromMat4(a: Matrix4): Matrix3;

    fromQuat(a: Quaternion): Matrix3;

    identity(): Matrix3;

    invert(): Matrix3;

    mul(b: Matrix3): Matrix3;

    mulLeft(a: Matrix3): Matrix3;

    multiply(b: Matrix3): Matrix3;

    multiplyLeft(a: Matrix3): Matrix3;

    rotate(rad: number): Matrix3;

    scale(v: Vector2): Matrix3;

    translate(v: Vector2): Matrix3;

    normalFromMat4(v: Matrix4): Matrix3;

    transpose(): Matrix3;

    toString(): string;

    static adjoint(out: Matrix3, a: Matrix3): Matrix3;

    static copy(out: Matrix3, a: Matrix3): Matrix3;

    static determinant(a: Matrix3): number;

    static identity(out: Matrix3): Matrix3;

    static invert(out: Matrix3, a: Matrix3): Matrix3;

    static mul(out: Matrix3, a: Matrix3, b: Matrix3): Matrix3;

    static multiply(out: Matrix3, a: Matrix3, b: Matrix3): Matrix3;

    static fromMat2d(out: Matrix3, a: Matrix2d): Matrix3;

    static fromMat4(out: Matrix3, a: Matrix4): Matrix3;

    static fromQuat(out: Matrix3, a: Quaternion): Matrix3;

    static normalFromMat4(out: Matrix3, a: Matrix4): Matrix3;

    static transpose(out: Matrix3, a: Matrix3): Matrix3;

    static rotate(out: Matrix3, a: Matrix3, rad: number): Matrix3;

    static scale(out: Matrix3, a: Matrix3, v: Vector2): Matrix3;

    static translate(out: Matrix3, a: Matrix3, v: Vector2): Matrix3;
}