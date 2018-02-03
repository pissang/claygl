import { Renderable} from '../Renderable';
import { Material} from '../Material';
import { Geometry} from '../Geometry';
import { Node} from '../Node';
import { Base} from '../core/Base';
import { Vector3} from '../math/Vector3';
import { Vector3} from '../math/Vector3';
import { Emitter} from 'Emitter';

interface IParticleSystemOption extends IRenderableOption {
    loop?: boolean;
    oneshot?: boolean;
    duration?: number;

    spriteAnimationTileX?: number;
    spriteAnimationTileY?: number;
    spriteAnimationRepeat?: number;
}

interface IParticleSystemField {
    applyTo(velocity: Vector3, position: Vector3, weight: number, deltaTime: number): void;
}

export class ParticleRenderable extends Renderable {

    constructor(option?: IParticleSystemOption);

    loop: boolean;

    oneshot: boolean;

    duration: number;

    spriteAnimationTileX: number;

    spriteAnimationTileY: number;

    spriteAnimationRepeat: number;

    addEmitter(emitter: Emitter): void;

    removeEmitter(emitter: Emitter): void;

    addField(field: IParticleSystemField): void;

    removeField(field: IParticleSystemField): void;

    reset(): void;

    updateParticles(deltaTime: number): void;

    isFinished(): boolean;

    dispose(gl: WebGLRenderingContext): void;

    clone(): ParticleRenderable;
}