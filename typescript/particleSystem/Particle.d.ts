///<reference path="../math/Vector3.d.ts" />
///<reference path="../math/Vector4.d.ts" />
///<reference path="Emitter.d.ts" />
declare module qtek {

    export module particleSystem {

        export class Particle {

            position: math.Vector3;

            rotation: math.Vector3;

            velocity: math.Vector3;

            angularVelocity: math.Vector3;

            life: number;

            age: number;

            spriteSize: number;

            weight: number;

            emitter: Emitter;

            update(deltaTime: number): void;
        }
    }
}