///<reference path="Matrix3.d.ts" />
///<reference path="Matrix4.d.ts" />
///<reference path="Quaternion.d.ts" />
declare module qtek {

    export module math {

        export class Vector3 {

            constructor(x: number, y: number, z: number);
            constructor();

            x: number;

            y: number;

            z: number;

            _array: Float32Array;

            _dirty: boolean;

            add(b: Vector3): Vector3;
            
            set(x: number, y: number, z: number): Vector3;

            setArray(arr: Float32Array): Vector3;
            setArray(arr: number[]): Vector3;

            clone(): Vector3;

            copy(b: Vector3): Vector3;

            cross(out: Vector3, b: Vector3): Vector3;

            dist(b: Vector3): number;

            distance(b: Vector3): number;

            div(b: Vector3): Vector3;

            divide(b: Vector3): Vector3;

            dot(b: Vector3): number;

            len(): number;

            length(): number;

            lerp(a: Vector3, b: Vector3, t: number): Vector3;

            min(b: Vector3): Vector3;

            max(b: Vector3): Vector3;

            mul(b: Vector3): Vector3;

            multiply(b: Vector3): Vector3;

            negate(): Vector3;

            normalize(): Vector3;

            random(scale: number): Vector3;

            scale(scale: number): Vector3;

            scaleAndAdd(b: Vector3, scale: number): Vector3;

            sqrDist(b: Vector3): number;

            squaredDistance(b: Vector3): number;

            sqrLen(): number;

            squaredLength(): number;

            sub(b: Vector3): Vector3;

            subtract(b: Vector3): Vector3;

            transformMat3(m: Matrix3): Vector3;

            transformMat4(m: Matrix4): Vector3;

            transformQuat(q: Quaternion): Vector3;

            applyProjection(m: Matrix4): Vector3;

            toString(): string;

            static POSITIVE_X: Vector3;
            static NEGATIVE_X: Vector3;
            static POSITIVE_Y: Vector3;
            static NEGATIVE_Y: Vector3;
            static POSITIVE_Z: Vector3;
            static NEGATIVE_Z: Vector3;

            static UP: Vector3;
            static ZERO: Vector3;

            static add(out: Vector3, a: Vector3, b: Vector3): Vector3;

            static set(out: Vector3, x: number, y: number, z: number): Vector3;

            static copy(out: Vector3, b: Vector3): Vector3;

            static cross(out: Vector3, a: Vector3, b: Vector3): Vector3;

            static dist(a: Vector3, b: Vector3): number;

            static distance(a: Vector3, b: Vector3): number;

            static div(out: Vector3, a: Vector3, b: Vector3): Vector3;

            static divide(out: Vector3, a: Vector3, b: Vector3): Vector3;

            static dot(a: Vector3, b: Vector3): number;

            static len(a: Vector3): number;

            // static length(a: Vector3): number;

            static lerp(out: Vector3, a: Vector3, b: Vector3, t: number): Vector3;

            static min(out: Vector3, a: Vector3, b: Vector3): Vector3;

            static max(out: Vector3, a: Vector3, b: Vector3): Vector3;

            static mul(out: Vector3, a: Vector3, b: Vector3): Vector3;

            static multiply(out: Vector3, a: Vector3, b: Vector3): Vector3;

            static negate(out: Vector3, a: Vector3): Vector3;

            static normalize(out: Vector3, a: Vector3): Vector3;

            static random(out: Vector3, scale: number): Vector3;

            static scale(out: Vector3, a: Vector3, scale: number): Vector3;

            static scaleAndAdd(out: Vector3, a: Vector3, b: Vector3, scale: number): Vector3;

            static sqrDist(a: Vector3, b: Vector3): number;

            static squaredDistance(a: Vector3, b: Vector3): number;

            static sub(out: Vector3, a: Vector3, b: Vector3): Vector3;

            static subtract(out: Vector3, a: Vector3, b: Vector3): Vector3;

            static transformMat3(out: Vector3, a: Vector3, m: Matrix3): Vector3;

            static transformMat4(out: Vector3, a: Vector3, m: Matrix4): Vector3;

            static transformQuat(out: Vector3, a: Vector3, q: Quaternion): Vector3;

        }
    }
}