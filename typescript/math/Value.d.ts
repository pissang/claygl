///<reference path="Vector3.d.ts" />
///<reference path="Vector2.d.ts" />
declare module qtek {

    export module math {

        export interface ConstantValue {
            get(): number;
        }

        export interface VectorValue<T> {
            get(out: T): T;
        }

        export interface Random1D {
            constructor(min: number, max: number);
            get(): number;
        }

        export interface Random2D {
            constructor(min: Vector2, max: Vector2);
            get(out: Vector2): Vector2;
        }

        export interface Random3D {
            constructor (min: Vector3, max: Vector3)
            get(out: Vector3): Vector3;
        }

        export class Value {

            static constant(constant: number): ConstantValue;

            static vector<T>(vector: T): VectorValue<T>;

            static random1D(min: number, max: number): Random1D;

            static random2D(min: Vector2, max: Vector2): Random2D;

            static random3D(min: Vector3, max: Vector3): Random3D;
        }
    }
}