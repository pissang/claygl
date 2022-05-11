import CompositeNode from './CompositeNode';
import * as constants from '../core/constants';
import FrameBuffer from '../FrameBuffer';
import type Scene from '../Scene';
import type Camera from '../Camera';
import type Renderer from '../Renderer';
import { GLEnum } from '../core/type';

export class CompositeSceneNode extends CompositeNode {
  name = 'scene';
  scene: Scene;
  camera: Camera;

  autoUpdateScene = true;
  preZ = false;

  frameBuffer = new FrameBuffer();

  constructor(scene: Scene, camera: Camera) {
    super();
    this.scene = scene;
    this.camera = camera;
  }

  render(renderer: Renderer) {
    this._rendering = true;
    const _gl = renderer.gl;
    const outputs = this.outputs;

    this.trigger('beforerender');

    let renderInfo;

    if (!outputs) {
      renderInfo = renderer.render(this.scene, this.camera, !this.autoUpdateScene, this.preZ);
    } else {
      const frameBuffer = this.frameBuffer;
      const outputNames = Object.keys(outputs);
      outputNames.forEach((outputName) => {
        const parameters = this.updateParameter(outputName, renderer);
        const outputInfo = outputs[outputName];
        const texture = this._compositor!.allocateTexture(parameters);
        this._outputTextures[outputName] = texture;

        let attachment = outputInfo.attachment || _gl.COLOR_ATTACHMENT0;
        if (typeof attachment == 'string') {
          attachment = _gl[attachment];
        }
        frameBuffer.attach(texture, attachment);
      });
      frameBuffer.bind(renderer);

      // MRT Support in chrome
      // https://www.khronos.org/registry/webgl/sdk/tests/conformance/extensions/ext-draw-buffers.html
      const ext = renderer.getGLExtension('EXT_draw_buffers');
      if (ext) {
        const bufs: GLEnum[] = [];
        outputNames.forEach((outputName) => {
          const attachment = outputs[outputName].attachment || constants.COLOR_ATTACHMENT0;
          if (
            attachment >= constants.COLOR_ATTACHMENT0 &&
            attachment <= constants.COLOR_ATTACHMENT0 + 8
          ) {
            bufs.push(attachment);
          }
        });
        ext.drawBuffersEXT(bufs);
      }

      // Always clear
      // PENDING
      renderer.saveClear();
      renderer.clearBit = constants.DEPTH_BUFFER_BIT | constants.COLOR_BUFFER_BIT;
      renderInfo = renderer.render(this.scene, this.camera, !this.autoUpdateScene, this.preZ);
      renderer.restoreClear();

      frameBuffer.unbind(renderer);
    }

    this.trigger('afterrender', renderInfo);

    this._rendering = false;
    this._rendered = true;
  }
}

export default CompositeSceneNode;
