import { Material } from './Material';
import { Renderable } from './Renderable';
import { Shader } from './Shader';
import { Node } from './Node';
import { Camera } from './Camera';

interface ISceneOption extends INodeOption {
    material?: Material;
    autoUpdate?: boolean;
}

type RenderList = {
    opaque: Renderable[],
    transparent: Renderable[]
};

export class Scene extends Node {

    constructor(option?: ISceneOption);

    material: Material;

    autoUpdate: boolean;

    getMainCamera(): Camera;
    setMainCamera(camera: Camera): void;

    updateRenderList(camera: Camera): RenderList;
    getRenderList(camera: Camera): RenderList;

    cloneNode(node: Node): Node;

    dispose(): void;
}
