import { Vector2 } from './Vector2';

export class Matrix2 {

    array: ArrayLike;

    clone(): Matrix2;

    copy(b: Matrix2): Matrix2;

    adjoint(): Matrix2;

    determinant(): number;

    identity(): Matrix2;

    invert(): Matrix2;

    mul(b: Matrix2): Matrix2;

    mulLeft(a: Matrix2): Matrix2;

    multiply(b: Matrix2): Matrix2;

    multiplyLeft(a: Matrix2): Matrix2;

    rotate(rad: number): Matrix2;

    scale(v: Vector2): Matrix2;

    transpose(): Matrix2;

    toString(): string;

    static adjoint(out: Matrix2, a: Matrix2): Matrix2;

    static copy(out: Matrix2, a: Matrix2): Matrix2;

    static determinant(a: Matrix2): number;

    static identity(out: Matrix2): Matrix2;

    static invert(out: Matrix2, a: Matrix2): Matrix2;

    static mul(out: Matrix2, a: Matrix2, b: Matrix2): Matrix2;

    static multiply(out: Matrix2, a: Matrix2, b: Matrix2): Matrix2;

    static rotate(out: Matrix2, a: Matrix2, rad: number): Matrix2;

    static scale(out: Matrix2, a: Matrix2, v: Vector2): Matrix2;

    static transpose(out: Matrix2, a: Matrix2): Matrix2;
}