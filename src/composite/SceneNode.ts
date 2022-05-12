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
    finalFrameBuffer?: FrameBuffer
  ): void {
    this.trigger('beforerender');

    let renderInfo;

    if (!outputTextures) {
      renderInfo = renderer.render(this.scene, this.camera, !this.autoUpdateScene, this.preZ);
    } else {
      // Always clear
      // PENDING
      renderer.saveClear();
      renderer.clearBit = constants.DEPTH_BUFFER_BIT | constants.COLOR_BUFFER_BIT;
      renderInfo = renderer.render(this.scene, this.camera, !this.autoUpdateScene, this.preZ);
      renderer.restoreClear();
    }

    this.trigger('afterrender', renderInfo);
  }
}

export default CompositeSceneNode;
