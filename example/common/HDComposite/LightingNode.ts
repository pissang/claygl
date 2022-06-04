import {
  CompositeNode,
  constants,
  FrameBuffer,
  Renderer,
  Texture,
  Scene,
  Camera,
  DeferredRenderer,
  Texture2D
} from 'claygl';
import GBufferCompositeNode from './GBufferNode';
class LightingCompositeNode extends CompositeNode<
  'gBufferTexture1' | 'gBufferTexture2' | 'gBufferTexture3',
  'color'
> {
  private _scene: Scene;
  private _camera: Camera;

  private _deferredRenderer: DeferredRenderer;
  constructor(scene: Scene, camera: Camera) {
    super();
    this._scene = scene;
    this._camera = camera;

    this._deferredRenderer = new DeferredRenderer();
    this._deferredRenderer.autoResize = false;

    this.outputs = {
      color: {
        type: constants.HALF_FLOAT_OES
      }
    };
  }

  fromGBufferNode(node: GBufferCompositeNode) {
    this.inputs = {
      gBufferTexture1: {
        node,
        output: 'texture1'
      },
      gBufferTexture2: {
        node,
        output: 'texture2'
      },
      gBufferTexture3: {
        node,
        output: 'texture3'
      }
    };
  }

  prepare(renderer: Renderer): void {}
  render(
    renderer: Renderer,
    inputTextures?: Record<'gBufferTexture1' | 'gBufferTexture2' | 'gBufferTexture3', Texture2D>,
    outputTextures?: Record<'color', Texture2D>,
    frameBuffer?: FrameBuffer
  ): void {
    if (!(outputTextures && outputTextures.color)) {
      // Needs resize manually
      this._deferredRenderer.resize(
        inputTextures!.gBufferTexture1.width,
        inputTextures!.gBufferTexture1.height
      );
    }
    this._deferredRenderer.render(renderer, this._scene, this._camera, {
      notUpdateScene: true,
      gBufferTexture1: inputTextures!.gBufferTexture1,
      gBufferTexture2: inputTextures!.gBufferTexture2,
      gBufferTexture3: inputTextures!.gBufferTexture3,
      targetTexture: outputTextures && outputTextures.color
    });
  }
}

export default LightingCompositeNode;
