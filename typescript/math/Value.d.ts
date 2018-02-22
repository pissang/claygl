import { Vector3 } from './Vector3';
import { Vector2 } from './Vector2';

interface ConstantValue {
    get(): number;
}

interface VectorValue<T> {
    get(out: T): T;
}

interface Random1D {
    constructor(min: number, max: number);
    get(): number;
}

interface Random2D {
    constructor(min: Vector2, max: Vector2);
    get(out: Vector2): Vector2;
}

interface Random3D {
    constructor (min: Vector3, max: Vector3)
    get(out: Vector3): Vector3;
}

class Value {

    static constant(constant: number): ConstantValue;

    static vector<T>(vector: T): VectorValue<T>;

    static random1D(min: number, max: number): Random1D;

    static random2D(min: Vector2, max: Vector2): Random2D;

    static random3D(min: Vector3, max: Vector3): Random3D;
}

class Matrix2 {

    array: Array;

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