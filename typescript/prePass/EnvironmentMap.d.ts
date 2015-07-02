///<reference path="../core/Base.d.ts" />
///<reference path="../math/Vector3.d.ts" />
///<reference path="../math/Vector3.d.ts" />
///<reference path="../TextureCube.d.ts" />
///<reference path="../Renderer.d.ts" />
///<reference path="../Scene.d.ts" />
declare module qtek {

    export module prePass {

        interface IEnvironmentMapOption {
            position?: math.Vector3;
            far?: number;
            near?: number;
            texture?: qtek.texture.TextureCube;
        }

        export class EnvironmentMap extends core.Base {

            constructor(option?: IEnvironmentMapOption);

            position: math.Vector3;

            far: number;
            
            near: number;
            
            texture: texture.TextureCube;

            render(renderer: Renderer, scene: Scene, notUpdateScene?: boolean): void;

            dispose(gl: WebGLRenderingContext): void;
        }
    }
}