import { Node } from 'Node';
import { Scene } from '../Scene';
import { Camera } from '../Camera';

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