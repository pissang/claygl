///<reference path="../math/Vector3.d.ts" />
declare module qtek {

    export module particleSystem {

        interface IParticleSystemForceFieldOption {

            force?: math.Vector3;
        }

        export class ForceField {

            constructor(option: IParticleSystemForceFieldOption);

            force: math.Vector3;

            applyTo(velocity: math.Vector3, position: math.Vector3, weight: number, deltaTime: number): void;
        }
    }
}