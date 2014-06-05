///<reference path="Vector2.d.ts" />
declare module qtek {

    export module math {

        export class Matrix2d {

            _array: Float32Array;

            clone(): Matrix2d;

            copy(b: Matrix2d): Matrix2d;

            determinant(): number;

            identity(): Matrix2d;

            invert(): Matrix2d;

            mul(b: Matrix2d): Matrix2d;

            mulLeft(a: Matrix2d): Matrix2d;

            multiply(b: Matrix2d): Matrix2d;

            multiplyLeft(a: Matrix2d): Matrix2d;

            rotate(rad: number): Matrix2d;

            scale(v: Vector2): Matrix2d;

            translate(v: Vector2): Matrix2d;

            toString(): string;

            static copy(out: Matrix2d, a: Matrix2d): Matrix2d;

            static determinant(a: Matrix2d): number;

            static identity(out: Matrix2d): Matrix2d;

            static invert(out: Matrix2d, a: Matrix2d): Matrix2d;

            static mul(out: Matrix2d, a: Matrix2d, b: Matrix2d): Matrix2d;

            static multiply(out: Matrix2d, a: Matrix2d, b: Matrix2d): Matrix2d;

            static rotate(out: Matrix2d, a: Matrix2d, rad: number): Matrix2d;

            static scale(out: Matrix2d, a: Matrix2d, v: Vector2): Matrix2d;

            static translate(out: Matrix2d, a: Matrix2d, v: Vector2): Matrix2d;
        }
    }
}