import { Vector3 } from '../math/Vector3';
import { Vector4 } from '../math/Vector4';
import { Emitter } from 'Emitter';

export class Particle {

    position: Vector3;

    rotation: Vector3;

    velocity: Vector3;

    angularVelocity: Vector3;

    life: number;

    age: number;

    spriteSize: number;

    weight: number;

    emitter: Emitter;

    update(deltaTime: number): void;
}