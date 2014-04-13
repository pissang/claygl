///<reference path="../Mesh.d.ts" />
///<reference path="../Material.d.ts" />
///<reference path="../Geometry.d.ts" />
///<reference path="../core/Base.d.ts" />
///<reference path="../math/Vector3.d.ts" />
///<reference path="../math/Vector3.d.ts" />
///<reference path="Emitter.d.ts" />
declare module qtek {

    export module particleSystem {

        interface IParticleSystemOption {
            loop?: boolean;
            oneshot?: boolean;
            duration?: time;

            spriteAnimationTileX?: number;
            spriteAnimationTileY?: number;
            spriteAnimationRepeat?: number;

            visible?: boolean;

            culling?: boolean;
            cullFace?: number;
            frontFace?: number;

        }

        interface IParticleSystemField {
            applyTo(velocity: math.Vector3, position: math.Vector3, weight: number, deltaTime: number): void;
        }

        export class ParticleSystem extends core.Base {

            constructor(option?: IParticleSystemOption);

            loop: boolean;

            oneshot: boolean;

            duration: number;

            spriteAnimationTileX: number;

            spriteAnimationTileY: number;

            spriteAnimationRepeat: number;

            geometry: Geometry;

            material: Material;

            visible: boolean;

            culling: boolean;

            cullFace: number;

            frontFace: number;

            // frustumCulling: boolean;
            // castShadow: boolean;
            // receiveShadow: boolean;
            isRenderable(): boolean;

            addEmitter(emitter: Emitter): void;

            removeEmitter(emitter: Emitter): void;

            addField(field: IParticleSystemField): void;

            removeField(field: IParticleSystemField): void;

            reset(): void;

            updateParticles(deltaTime: number): void;

            render(gl: WebGLRenderingContext): IMeshRenderInfo;

            isFinished(): boolean;

            dispose(gl: WebGLRenderingContext): void;

            clone(): ParticleSystem;
        }
    }
}