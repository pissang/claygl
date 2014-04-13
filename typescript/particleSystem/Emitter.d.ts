///<reference path="../core/Base.d.ts" />
///<reference path="../math/Value.d.ts" />
///<reference path="../math/Vector3.d.ts" />
///<reference path="../math/Vector2.d.ts" />
///<reference path="Particle.d.ts" />
declare module qtek {

    export module particleSystem {

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
            position?: IValueGetterND<math.Vector3>;
            rotation?: IValueGetterND<math.Vector3>;
            velocity?: IValueGetterND<math.Vector3>;
            angularVelocity?: IValueGetterND<math.Vector3>;

            spriteSize?: IValueGetter1D;
            weight?: IValueGetter1D;
        }

        export class Emitter extends core.Base {

            constructor(option?: IParticleEmitterOption);

            max: number;

            amount: number;

            life: IValueGetter1D;
            
            position: IValueGetterND<math.Vector3>;
            
            rotation: IValueGetterND<math.Vector3>;
            
            velocity: IValueGetterND<math.Vector3>;
            
            angularVelocity: IValueGetterND<math.Vector3>;

            spriteSize: IValueGetter1D;
            
            weight: IValueGetter1D;

            emit(out: Particle[]): void;

            kill(particle: Particle): void;


            static constant(constant: number): math.ConstantValue;

            static vector<T>(vector: T): math.VectorValue<T>;

            static random1D(min: number, max: number): math.Random1D;

            static random2D(min: math.Vector2, max: math.Vector2): math.Random2D;

            static random3D(min: math.Vector3, max: math.Vector3): math.Random3D;
        }
    }
}