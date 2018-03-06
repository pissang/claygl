import { Renderer } from '../Renderer'
import { Camera } from '../Camera'
import { Scene } from '../Scene'
import { Texture2D } from '../Texture2D'

interface IGBufferOption {
    enableTargetTexture1?: boolean;
    enableTargetTexture2?: boolean;
    enableTargetTexture3?: boolean;

    renderTransparent?: boolean;
}

export class GBuffer {

    constructor(option?: IGBufferOption);

    enableTargetTexture1: boolean;
    enableTargetTexture2: boolean;
    enableTargetTexture3: boolean;

    renderTransparent: boolean;

    resize(width, height): void;

    update(renderer: Renderer, scene: Scene, camera: Camera): void;

    getTargetTexture1(): Texture2D;
    getTargetTexture2(): Texture2D;
    getTargetTexture3(): Texture2D;

    dispose(renderer: Renderer): void;
}