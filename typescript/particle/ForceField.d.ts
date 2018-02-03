import { Vector3 } from '../math/Vector3';


interface IParticleSystemForceFieldOption {

    force?: Vector3;
}

export class ForceField {

    constructor(option: IParticleSystemForceFieldOption);

    force: Vector3;

    applyTo(velocity: Vector3, position: Vector3, weight: number, deltaTime: number): void;
}