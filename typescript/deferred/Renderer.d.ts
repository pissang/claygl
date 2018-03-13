import { Renderer } from '../Renderer'
import { Camera } from '../Camera'
import { Scene } from '../Scene'
import { Texture2D } from '../Texture2D'
import { FrameBuffer } from '../FrameBuffer'
import { ShadowMap } from '../prePass/ShadowMap'
import { GBuffer } from './GBuffer'
import { Base } from '../core/Base';

interface IDeferredRendererOption {
    shadowMapPass?: ShadowMap;
    autoResize?: boolean;
}

export class Renderer extends Base {

    constructor(option?: IDeferredRendererOption);

    shadowMapPass: ShadowMap;

    autoResize: boolean;

    resize(width, height): void;

    render(renderer: Renderer, scene: Scene, camera: Camera, opts?: {
        renderToTarget?: boolean,
        notUpdateShadow?: boolean,
        notUpdateScene?: boolean
    }): void;

    getTargetTexture(): Texture2D;
    getTargetFrameBuffer(): FrameBuffer;

    getGBuffer(): GBuffer;

    setViewport(x: number, y: number, width: number, height: number): void;

    dispose(renderer: Renderer): void;
}