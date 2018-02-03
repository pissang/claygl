import { Material } from './Material';
import { Renderable } from './Renderable';
import { Shader } from './Shader';
import { Node } from './Node';

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
