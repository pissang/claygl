import CompositeNode from './CompositeNode';
import * as constants from '../core/constants';
import FrameBuffer from '../FrameBuffer';
import type Scene from '../Scene';
import type Camera from '../Camera';
import type Renderer from '../Renderer';
import { GLEnum } from '../core/type';
import Texture from '../Texture';

export class CompositeSceneNode extends CompositeNode {
  name = 'scene';
  scene: Scene;
  camera: Camera;

  autoUpdateScene = true;
  preZ = false;

  constructor(scene: Scene, camera: Camera) {
    super();
    this.scene = scene;
    this.camera = camera;
  }

  prepare() {}

  render(
    renderer: Renderer,
    inputTextures: Record<string, Texture>,
    outputTextures?: Record<string, Texture>,
    frameBuffer?: FrameBuffer
  ): void {
    renderer.render(this.scene, this.camera, frameBuffer, {
      preZ: this.preZ,
      notUpdateScene: !this.autoUpdateScene
    });
  }
}

export default CompositeSceneNode;
