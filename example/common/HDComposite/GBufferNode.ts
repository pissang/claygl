import {
  CompositeNode,
  constants,
  FrameBuffer,
  Renderer,
  Texture,
  Scene,
  Camera,
  DeferredGBuffer,
  Texture2D
} from 'claygl';

type GBufferOutput = 'texture1' | 'texture2' | 'texture3' | 'texture4';

class GBufferCompositeNode extends CompositeNode<never, GBufferOutput> {
  name = 'GBuffer';

  private _scene: Scene;
  private _camera: Camera;
  private _gbuffer = new DeferredGBuffer();

  depthBuffer = true;

  enableTexture1: boolean = true;
  enableTexture2: boolean = true;
  enableTexture3: boolean = true;
  enableTexture4: boolean = false;

  constructor(scene: Scene, camera: Camera) {
    super();
    this._scene = scene;
    this._camera = camera;
  }

  prepare(renderer: Renderer): void {
    const commonTextureOpts = {
      minFilter: constants.NEAREST,
      magFilter: constants.NEAREST,
      wrapS: constants.CLAMP_TO_EDGE,
      wrapT: constants.CLAMP_TO_EDGE
    };
    this.outputs = {
      texture1: {
        type: constants.HALF_FLOAT,
        disabled: !this.enableTexture1,
        ...commonTextureOpts
      },
      texture2: {
        // TODO DEPTH_STENCIL have invalid internalFormat error.
        internalFormat: constants.DEPTH24_STENCIL8,
        format: constants.DEPTH_STENCIL,
        type: constants.UNSIGNED_INT_24_8,
        attachment: constants.DEPTH_ATTACHMENT,
        disabled: !this.enableTexture2,
        ...commonTextureOpts
      },
      texture3: {
        type: constants.HALF_FLOAT,
        disabled: !this.enableTexture3,
        ...commonTextureOpts
      },
      texture4: {
        type: constants.HALF_FLOAT,
        disabled: !this.enableTexture4,
        ...commonTextureOpts
      }
    };
  }
  render(
    renderer: Renderer,
    inputTextures?: Record<never, Texture>,
    outputTextures?: Record<GBufferOutput, Texture>,
    frameBuffer?: FrameBuffer
  ): void {
    outputTextures = outputTextures || ({} as Record<GBufferOutput, Texture>);
    const gbuffer = this._gbuffer;
    gbuffer.enableTargetTexture1 = this.enableTexture1;
    gbuffer.enableTargetTexture2 = this.enableTexture2;
    gbuffer.enableTargetTexture3 = this.enableTexture3;
    gbuffer.enableTargetTexture4 = this.enableTexture4;

    gbuffer.update(renderer, this._scene, this._camera, {
      targetTexture1: outputTextures.texture1 as Texture2D,
      targetTexture2: outputTextures.texture2 as Texture2D,
      targetTexture3: outputTextures.texture3 as Texture2D,
      targetTexture4: outputTextures.texture4 as Texture2D
    });
  }
}

export default GBufferCompositeNode;
