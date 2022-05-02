// @ts-nocheck
import CompositorNode from './CompositorNode';
import * as glenum from '../core/glenum';
import FrameBuffer from '../FrameBuffer';

/**
 * @constructor clay.compositor.SceneNode
 * @extends clay.compositor.CompositorNode
 */
const SceneNode = CompositorNode.extend(
  /** @lends clay.compositor.SceneNode# */
  {
    name: 'scene',
    /**
     * @type {clay.Scene}
     */
    scene: null,
    /**
     * @type {clay.Camera}
     */
    camera: null,
    /**
     * @type {boolean}
     */
    autoUpdateScene: true,
    /**
     * @type {boolean}
     */
    preZ: false
  },
  function () {
    this.frameBuffer = new FrameBuffer();
  },
  {
    render: function (renderer) {
      this._rendering = true;
      const _gl = renderer.gl;

      this.trigger('beforerender');

      let renderInfo;

      if (!this.outputs) {
        renderInfo = renderer.render(this.scene, this.camera, !this.autoUpdateScene, this.preZ);
      } else {
        const frameBuffer = this.frameBuffer;
        for (const name in this.outputs) {
          const parameters = this.updateParameter(name, renderer);
          const outputInfo = this.outputs[name];
          const texture = this._compositor.allocateTexture(parameters);
          this._outputTextures[name] = texture;

          let attachment = outputInfo.attachment || _gl.COLOR_ATTACHMENT0;
          if (typeof attachment == 'string') {
            attachment = _gl[attachment];
          }
          frameBuffer.attach(texture, attachment);
        }
        frameBuffer.bind(renderer);

        // MRT Support in chrome
        // https://www.khronos.org/registry/webgl/sdk/tests/conformance/extensions/ext-draw-buffers.html
        const ext = renderer.getGLExtension('EXT_draw_buffers');
        if (ext) {
          const bufs = [];
          for (let attachment in this.outputs) {
            attachment = parseInt(attachment);
            if (
              attachment >= glenum.COLOR_ATTACHMENT0 &&
              attachment <= glenum.COLOR_ATTACHMENT0 + 8
            ) {
              bufs.push(attachment);
            }
          }
          ext.drawBuffersEXT(bufs);
        }

        // Always clear
        // PENDING
        renderer.saveClear();
        renderer.clearBit = glenum.DEPTH_BUFFER_BIT | glenum.COLOR_BUFFER_BIT;
        renderInfo = renderer.render(this.scene, this.camera, !this.autoUpdateScene, this.preZ);
        renderer.restoreClear();

        frameBuffer.unbind(renderer);
      }

      this.trigger('afterrender', renderInfo);

      this._rendering = false;
      this._rendered = true;
    }
  }
);

export default SceneNode;
