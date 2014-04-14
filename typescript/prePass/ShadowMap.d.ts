///<reference path="../Renderer.d.ts" />
///<reference path="../Scene.d.ts" />
///<reference path="../Camera.d.ts" />
declare module qtek {

    export module prePass {

        interface IShadowMapOption {
            softShadow?: number;
            shadowBlur?: number;
            shadowCascade?: number;
            cascadeSplitLogFactor?: number;
        }

        export class ShadowMap {

            softShadow: number;

            shadowBlur: number;

            shadowCascade: number;

            cascadeSplitLogFactor: number;

            render(renderer: Renderer, scene: Scene, sceneCamera?: Camera): void;

            renderDebug(renderer: Renderer, size?: number): void;

            dispose(gl: WebGLRenderingContext): void;

            static VSM: number;
            static PCF: number;
        }
    }
}