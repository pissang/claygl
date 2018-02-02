///<reference path="Material.d.ts" />
///<reference path="Renderable.d.ts" />
///<reference path="Shader.d.ts" />
///<reference path="Node.d.ts" />

interface ISceneOption extends INodeOption {
    material?: Material;
    autoUpdate?: boolean;
}

export class Scene extends Node {

    constructor(option?: ISceneOption);

    material: Material;

    autoUpdate: boolean;

    opaqueList: Renderable[];

    transparentList: Renderable[];

    getNode(name: string): Node;

    dispose(): void;
}
