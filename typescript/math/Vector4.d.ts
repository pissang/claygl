import { Quaternion } from './Quaternion';
import { Matrix4 } from './Matrix4';

export class Vector4 {

    constructor(x: number, y: number, z: number, w: number);
    constructor();

    x: number;

    y: number;

    z: number;

    w: number;

    array: ArrayLike;

    _dirty: boolean;

    add(b: Vector4): Vector4;

    set(x: number, y: number, z: number, w: number): Vector4;

    setArray(arr: ArrayLike): Vector4;
    setArray(arr: number[]): Vector4;

    clone(): Vector4;

    copy(b: Vector4): Vector4;

    cross(out: Vector4, b: Vector4): Vector4;

    dist(b: Vector4): number;

    distance(b: Vector4): number;

    div(b: Vector4): Vector4;

    divide(b: Vector4): Vector4;

    dot(b: Vector4): number;

    len(): number;

    length(): number;

    lerp(a: Vector4, b: Vector4, t: number): Vector4;

    min(b: Vector4): Vector4;

    max(b: Vector4): Vector4;

    mul(b: Vector4): Vector4;

    multiply(b: Vector4): Vector4;

    negate(): Vector4;

    normalize(): Vector4;

    random(scale: number): Vector4;

    scale(scale: number): Vector4;

    scaleAndAdd(b: Vector4, scale: number): Vector4;

    sqrDist(b: Vector4): number;

    squaredDistance(b: Vector4): number;

    sqrLen(): number;

    squaredLength(): number;

    sub(b: Vector4): Vector4;

    subtract(b: Vector4): Vector4;

    transformMat4(m: Matrix4): Vector4;

    transformQuat(q: Quaternion): Vector4;

    toString(): string;

    static add(out: Vector4, a: Vector4, b: Vector4): Vector4;

    static set(out: Vector4, x: number, y: number, z: number, w: number): Vector4;

    static copy(out: Vector4, b: Vector4): Vector4;

    static cross(out: Vector4, a: Vector4, b: Vector4): Vector4;

    static dist(a: Vector4, b: Vector4): number;

    static distance(a: Vector4, b: Vector4): number;

    static div(out: Vector4, a: Vector4, b: Vector4): Vector4;

    static divide(out: Vector4, a: Vector4, b: Vector4): Vector4;

    static dot(a: Vector4, b: Vector4): number;

    static len(a: Vector4): number;

    // static length(a: Vector4): number;

    static lerp(out: Vector4, a: Vector4, b: Vector4, t: number): Vector4;

    static min(out: Vector4, a: Vector4, b: Vector4): Vector4;

    static max(out: Vector4, a: Vector4, b: Vector4): Vector4;

    static mul(out: Vector4, a: Vector4, b: Vector4): Vector4;

    static multiply(out: Vector4, a: Vector4, b: Vector4): Vector4;

    static negate(out: Vector4, a: Vector4): Vector4;

    static normalize(out: Vector4, a: Vector4): Vector4;

    static random(out: Vector4, scale: number): Vector4;

    static scale(out: Vector4, a: Vector4, scale: number): Vector4;

    static scaleAndAdd(out: Vector4, a: Vector4, b: Vector4, scale: number): Vector4;

    static sqrDist(a: Vector4, b: Vector4): number;

    static squaredDistance(a: Vector4, b: Vector4): number;

    static sub(out: Vector4, a: Vector4, b: Vector4): Vector4;

    static subtract(out: Vector4, a: Vector4, b: Vector4): Vector4;

    static transformMat4(out: Vector4, a: Vector4, m: Matrix4): Vector4;

    static transformQuat(out: Vector4, a: Vector4, q: Quaternion): Vector4;
}
