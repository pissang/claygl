import { Node } from 'Node';
import { Texture } from '../Texture';

interface ICompositorTextureNodeOption {
    name?: string;
    outputs?: IDictionary<ICompositorNodeOutput>;
    texture: Texture;
}

export class TextureNode extends Node {

    constructor(option?: ICompositorTextureNodeOption);

    texture: Texture;
}