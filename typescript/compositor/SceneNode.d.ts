import { Node } from '../Node';
import { Scene } from '../Scene';
import { Camera } from '../Camera';
import { IDictionary } from '../core/container';
import { ICompositorNodeOutput } from '../compositor/CompositorNode';

interface ICompositorSceneNodeOption {
    name?: string;
    scene?: Scene;
    camera?: Camera;
    autoUpdateScene?: boolean;
    preZ?: boolean;
    outputs?: IDictionary<ICompositorNodeOutput>;
}

export class SceneNode extends Node {

    constructor(option: ICompositorSceneNodeOption);

    scene: Scene;

    camera: Camera;

    autoUpdateScene: boolean;

    preZ: boolean;
}
