import { Base } from '../core/Base';
import { Value } from '../math/Value';
import { Vector3 } from '../math/Vector3';
import { Vector2 } from '../math/Vector2';
import { Particle } from 'Particle';

interface IValueGetter1D {
    get(): number;
}

interface IValueGetterND<T> {
    get(out: T): T;
}

interface IParticleEmitterOption {
    max?: number;
    amount?: number;

    life?: IValueGetter1D;
    position?: IValueGetterND<Vector3>;
    rotation?: IValueGetterND<Vector3>;
    velocity?: IValueGetterND<Vector3>;
    angularVelocity?: IValueGetterND<Vector3>;

    spriteSize?: IValueGetter1D;
    weight?: IValueGetter1D;
}

export class Emitter extends Base {

    constructor(option?: IParticleEmitterOption);

    max: number;

    amount: number;

    life: IValueGetter1D;

    position: IValueGetterND<Vector3>;

    rotation: IValueGetterND<Vector3>;

    velocity: IValueGetterND<Vector3>;

    angularVelocity: IValueGetterND<Vector3>;

    spriteSize: IValueGetter1D;

    weight: IValueGetter1D;

    emit(out: Particle[]): void;

    kill(particle: Particle): void;


    static constant(constant: number): ConstantValue;

    static vector<T>(vector: T): VectorValue<T>;

    static random1D(min: number, max: number): Random1D;

    static random2D(min: Vector2, max: Vector2): Random2D;

    static random3D(min: Vector3, max: Vector3): Random3D;
}