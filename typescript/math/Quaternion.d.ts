import { Matrix3 } from './Matrix3';
import { Matrix4 } from './Matrix4';
import { Vector3 } from './Vector3';


export class Quaternion {

    constructor(x: number, y: number, z: number, w: number);
    constructor();

    x: number;

    y: number;

    z: number;

    w: number;

    array: ArrayLike;

    _dirty: boolean;

    add(b: Quaternion): Quaternion;

    calculateW(): Quaternion;

    set(x: number, y: number, z: number, w: number): Quaternion;

    setArray(arr: ArrayLike): Quaternion;
    setArray(arr: number[]): Quaternion;

    clone(): Quaternion;

    conjugate(): Quaternion;

    copy(b: Quaternion): Quaternion;

    dot(b: Quaternion): number;

    fromMat3(m: Matrix3): Quaternion;

    fromMat4(m: Matrix4): Quaternion;

    identity(): Quaternion;

    invert(): Quaternion;

    len(): number;

    length(): number;

    lerp(a: Quaternion, b: Quaternion, t: number): Quaternion;

    mul(b: Quaternion): Quaternion;

    mulLeft(a: Quaternion): Quaternion;

    multiply(b: Quaternion): Quaternion;

    multiplyLeft(a: Quaternion): Quaternion;

    normalize(): Quaternion;

    rotateX(rad: number): Quaternion;

    rotateY(rad: number): Quaternion;

    rotateZ(rad: number): Quaternion;

    rotationTo(a: Vector3, b: Vector3): Quaternion;

    setAxes(view: Vector3, right: Vector3, up: Vector3): Quaternion;

    setAxisAngle(axis: Vector3, rad: number): Quaternion;

    slerp(a: Quaternion, b: Quaternion, t: number): Quaternion;

    sqrLen(): number;

    squaredLength(): number;

    toString(): Quaternion;

    static add(out: Quaternion, a: Quaternion, b: Quaternion): Quaternion;

    static set(out: Quaternion, x: number, y: number, z: number, w: number): Quaternion;

    static copy(out: Quaternion, b: Quaternion): Quaternion;

    static calculateW(out: Quaternion, a: Quaternion): Quaternion;

    static conjugate(out: Quaternion, a: Quaternion): Quaternion;

    static identity(out: Quaternion): Quaternion;

    static invert(out: Quaternion, a: Quaternion): Quaternion;

    static dot(a: Quaternion, b: Quaternion): number;

    static len(a: Quaternion): number;

    static lerp(out: Quaternion, a: Quaternion, b: Quaternion, t: number): Quaternion;

    static slerp(out: Quaternion, a: Quaternion, b: Quaternion, t: number): Quaternion;

    static mul(out: Quaternion, a: Quaternion, b: Quaternion): Quaternion;

    static multiply(out: Quaternion, a: Quaternion, b: Quaternion): Quaternion;

    static rotateX(out: Quaternion, a: Quaternion, rad: number): Quaternion;

    static rotateY(out: Quaternion, a: Quaternion, rad: number): Quaternion;

    static rotateZ(out: Quaternion, a: Quaternion, rad: number): Quaternion;

    static setAxisAngle(out: Quaternion, axis: Vector3, rad: number): Quaternion;

    static normalize(out: Quaternion, a: Quaternion): Quaternion;

    static sqrLen(a: Quaternion): number;

    static squaredLength(a: Quaternion): number;

    static fromMat3(out: Quaternion, m: Matrix3): Quaternion;

    static setAxes(out: Quaternion, view: Vector3, right: Vector3, up: Vector3): Quaternion;

    static rotationTo(out: Quaternion, a: Vector3, b: Vector3): Quaternion;
}