import CompositeNode, { CompositeNodeOutput } from './CompositeNode';
import FrameBuffer from '../FrameBuffer';
import type Scene from '../Scene';
import type Camera from '../Camera';
import type Renderer from '../Renderer';
import Texture from '../Texture';

class SceneCompositeNode<OutputKey extends string = 'color'> extends CompositeNode<
  never,
  OutputKey
> {
  name = 'scene';
  scene: Scene;
  camera?: Camera;

  autoUpdateScene = true;
  preZ = false;

  depthBuffer = true;

  constructor(scene: Scene, camera?: Camera, outputs?: Record<OutputKey, CompositeNodeOutput>) {
    super();
    this.scene = scene;
    this.camera = camera;

    this.outputs =
      outputs ||
      ({
        color: {}
      } as Record<OutputKey, CompositeNodeOutput>);
  }

  prepare() {}

  render(
    renderer: Renderer,
    inputTextures: Record<string, Texture>,
    outputTextures?: Record<string, Texture>,
    frameBuffer?: FrameBuffer
  ): void {
    renderer.render(this.scene, this.camera || this.scene.getMainCamera(), frameBuffer, {
      preZ: this.preZ,
      notUpdateScene: !this.autoUpdateScene
    });
  }
}

export default SceneCompositeNode;
