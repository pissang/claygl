import { Vector3 } from './Vector3';
import { Vector2 } from './Vector2';

export interface ConstantValue {
    get(): number;
}

export interface VectorValue<T> {
    get(out: T): T;
}

export interface Random1D {
    get(): number;
}

export interface Random2D {
    get(out: Vector2): Vector2;
}

export interface Random3D {
    get(out: Vector3): Vector3;
}

export class Value {

    static constant(constant: number): ConstantValue;

    static vector<T>(vector: T): VectorValue<T>;

    static random1D(min: number, max: number): Random1D;

    static random2D(min: Vector2, max: Vector2): Random2D;

    static random3D(min: Vector3, max: Vector3): Random3D;
}
