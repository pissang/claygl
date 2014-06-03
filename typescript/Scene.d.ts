///<reference path="Material.d.ts" />
///<reference path="Renderable.d.ts" />
///<reference path="Shader.d.ts" />
///<reference path="Node.d.ts" />
declare module qtek {

    interface ISceneOption extends INodeOption {
        material?: Material;
        autoUpdate?: boolean;
    }

    export class Scene extends Node {

        constructor(option?: ISceneOption);

        material: Material;

        autoUpdate: boolean;

        opaqueQueue: Renderable[];

        transparentQueue: Renderable[];

        addToScene(node: Node): void;
        
        removeFromScene(node: Node): void;

        getNode(name: string): Node;

        // isShaderLightNumberChanged(shader: Shader): boolean;

        // setShaderLightNumber(shader: Shader): void;

        // setLightUniforms(shader: Shader, _gl, WebGLRenderingContext): void;

        dispose(): void;
    }

}