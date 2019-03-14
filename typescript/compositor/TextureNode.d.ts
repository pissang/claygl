import { Node } from '../Node';
import { Texture } from '../Texture';
import { IDictionary } from '../core/container';
import { ICompositorNodeOutput } from '../compositor/CompositorNode';

export interface ICompositorTextureNodeOption {
    name?: string;
    outputs?: IDictionary<ICompositorNodeOutput>;
    texture: Texture;
}

export class TextureNode extends Node {

    constructor(option?: ICompositorTextureNodeOption);

    texture: Texture;
}
