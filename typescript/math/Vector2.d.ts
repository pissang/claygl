///<reference path="Matrix2.d.ts" />
///<reference path="Matrix2d.d.ts" />
///<reference path="Matrix3.d.ts" />
///<reference path="Matrix4.d.ts" />
declare module qtek {

    export module math {

        export class Vector2 {

            constructor(x: number, y: number);
            constructor();

            x: number;

            y: number;

            _array: Float32Array;

            _dirty: boolean;

            add(b: Vector2): Vector2;
            
            set(x: number, y: number): Vector2;

            setArray(arr: Float32Array): Vector2;
            setArray(arr: number[]): Vector2;

            clone(): Vector2;

            copy(b: Vector2): Vector2;

            cross(out: Vector3, b: Vector2): Vector2;

            dist(b: Vector2): number;

            distance(b: Vector2): number;

            div(b: Vector2): Vector2;
            
            divide(b: Vector2): Vector2;
            
            dot(b: Vector2): number;

            len(): number;
            
            length(): number;
            
            lerp(a: Vector2, b: Vector2, t: number): Vector2;
            
            min(b: Vector2): Vector2;

            max(b: Vector2): Vector2;

            mul(b: Vector2): Vector2;
            
            multiply(b: Vector2): Vector2;

            negate(): Vector2;

            normalize(): Vector2;

            random(scale: number): Vector2;

            scale(scale: number): Vector2;

            scaleAndAdd(b: Vector2, scale: number): Vector2;

            sqrDist(b: Vector2): number;

            squaredDistance(b: Vector2): number;
            
            sqrLen(): number;

            squaredLength(): number;

            sub(b: Vector2): Vector2;
            
            subtract(b: Vector2): Vector2;
            
            transformMat2(m: Matrix2): Vector2;
            
            transformMat2d(m: Matrix2d): Vector2;
            
            transformMat3(m: Matrix3): Vector2;
            
            transformMat4(m: Matrix4): Vector2;

            toString(): string;

            static add(out: Vector2, a: Vector2, b: Vector2): Vector2;
            
            static set(out: Vector2, x: number, y: number): Vector2;
            
            static copy(out: Vector2, b: Vector2): Vector2;
            
            static cross(out: Vector3, a: Vector2, b: Vector2): Vector2;
            
            static dist(a: Vector2, b: Vector2): number;
            
            static distance(a: Vector2, b: Vector2): number;
            
            static div(out: Vector2, a: Vector2, b: Vector2): Vector2;
            
            static divide(out: Vector2, a: Vector2, b: Vector2): Vector2;
            
            static dot(a: Vector2, b: Vector2): number;
            
            static len(a: Vector2): number;

            // static length(a: Vector2): number;
            
            static lerp(out: Vector2, a: Vector2, b: Vector2, t: number): Vector2;
            
            static min(out: Vector2, a: Vector2, b: Vector2): Vector2;
            
            static max(out: Vector2, a: Vector2, b: Vector2): Vector2;
            
            static mul(out: Vector2, a: Vector2, b: Vector2): Vector2;
            
            static multiply(out: Vector2, a: Vector2, b: Vector2): Vector2;
            
            static negate(out: Vector2, a: Vector2): Vector2;
            
            static normalize(out: Vector2, a: Vector2): Vector2;
            
            static random(out: Vector2, scale: number): Vector2;
            
            static scale(out: Vector2, a: Vector2, scale: number): Vector2;
            
            static scaleAndAdd(out: Vector2, a: Vector2, b: Vector2, scale: number): Vector2;
            
            static sqrDist(a: Vector2, b: Vector2): number;
            
            static squaredDistance(a: Vector2, b: Vector2): number;

            static sqrLen(a: Vector2): number;

            static squaredLength(a: Vector2): number;
            
            static sub(out: Vector2, a: Vector2, b: Vector2): Vector2;
            
            static subtract(out: Vector2, a: Vector2, b: Vector2): Vector2;
            
            static transformMat2(out: Vector2, a: Vector2, m: Matrix2): Vector2;
            
            static transformMat2d(out: Vector2, a: Vector2, m: Matrix2d): Vector2;
            
            static transformMat3(out: Vector2, a: Vector2, m: Matrix3): Vector2;
            
            static transformMat4(out: Vector2, a: Vector2, m: Matrix4): Vector2;
        }
    }
}