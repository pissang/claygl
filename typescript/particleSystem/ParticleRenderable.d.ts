///<reference path="../Renderable.d.ts" />
///<reference path="../Material.d.ts" />
///<reference path="../Geometry.d.ts" />
///<reference path="../Node.d.ts" />
///<reference path="../core/Base.d.ts" />
///<reference path="../math/Vector3.d.ts" />
///<reference path="../math/Vector3.d.ts" />
///<reference path="Emitter.d.ts" />
declare module qtek {

    export module particleSystem {

        interface IParticleSystemOption extends IRenderableOption {
            loop?: boolean;
            oneshot?: boolean;
            duration?: number;

            spriteAnimationTileX?: number;
            spriteAnimationTileY?: number;
            spriteAnimationRepeat?: number;
        }

        interface IParticleSystemField {
            applyTo(velocity: math.Vector3, position: math.Vector3, weight: number, deltaTime: number): void;
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
    }
}