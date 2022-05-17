import OrthoCamera from '../camera/Orthographic';
import Plane from '../geometry/Plane';
import Shader, { FragmentShader, VertexShader } from '../Shader';
import Material from '../Material';
import Mesh from '../Mesh';
import * as constants from '../core/constants';
import { fullscreenQuadPassVertex } from '../shader/source/compositor/vertex.glsl';
import { GLEnum } from '../core/type';
import { isArray, optional } from '../core/util';
import type Renderer from '../Renderer';
import type FrameBuffer from '../FrameBuffer';
import type Texture2D from '../Texture2D';
import Notifier from '../core/Notifier';

const planeGeo = new Plane();
let mesh: Mesh;
const camera = new OrthoCamera();

interface FullscreenQuadPassOpts {
  clearColor?: boolean;
  clearDepth?: boolean;
  blendWithPrevious?: boolean;
}

class FullscreenQuadPass<
  T extends FragmentShader<any, any, any> = FragmentShader
> extends Notifier {
  material: Material<Shader<VertexShader<{}, {}, {}, {}>, T>>;

  clearColor?: boolean;
  clearDepth?: boolean;
  blendWithPrevious?: boolean;

  outputs?: Record<string, Texture2D | undefined> = {};

  constructor(frag: T, opts?: Partial<FullscreenQuadPassOpts>) {
    super();

    const shader = new Shader(fullscreenQuadPassVertex, frag);
    const material = new Material(shader);
    material.enableTexturesAll();
    this.material = material;

    opts = opts || {};
    this.clearColor = opts.clearColor || false;
    this.blendWithPrevious = opts.blendWithPrevious || false;
    this.clearDepth = optional(opts.clearColor, true);
  }

  attachOutput(texture: Texture2D, attachment?: GLEnum) {
    if (!this.outputs) {
      this.outputs = {};
    }
    attachment = attachment || constants.COLOR_ATTACHMENT0;
    this.outputs[attachment] = texture;
  }
  /**
   * @param  {clay.Texture} texture
   */
  detachOutput(texture: Texture2D) {
    for (const attachment in this.outputs) {
      if (this.outputs[attachment] === texture) {
        this.outputs[attachment] = undefined;
      }
    }
  }

  bind(renderer: Renderer, frameBuffer: FrameBuffer) {
    for (const attachment in this.outputs) {
      const texture = this.outputs[attachment];
      if (texture) {
        frameBuffer.attach(texture, +attachment);
      }
    }

    if (frameBuffer) {
      frameBuffer.bind(renderer);
    }
  }

  unbind(renderer: Renderer, frameBuffer: FrameBuffer) {
    frameBuffer.unbind(renderer);
  }

  render(renderer: Renderer, frameBuffer?: FrameBuffer) {
    const _gl = renderer.gl;

    if (frameBuffer) {
      this.bind(renderer, frameBuffer);
      // MRT Support in chrome
      // https://www.khronos.org/registry/webgl/sdk/tests/conformance/extensions/ext-draw-buffers.html
      const ext = renderer.getWebGLExtension('EXT_draw_buffers');
      if (ext && this.outputs) {
        const bufs = [];
        for (const attachment in this.outputs) {
          if (
            +attachment >= constants.COLOR_ATTACHMENT0 &&
            +attachment <= constants.COLOR_ATTACHMENT0 + 8
          ) {
            bufs.push(attachment);
          }
        }
        ext.drawBuffersEXT(bufs);
      }
    }

    this.trigger('beforerender', this, renderer);

    // FIXME Don't clear in each pass in default, let the color overwrite the buffer
    // FIXME pixels may be discard
    let clearBit = this.clearDepth ? constants.DEPTH_BUFFER_BIT : 0;
    const blendWithPrevious = this.blendWithPrevious;
    _gl.depthMask(true);
    if (this.clearColor) {
      clearBit = clearBit | constants.COLOR_BUFFER_BIT;
      _gl.colorMask(true, true, true, true);
      const cc = this.clearColor;
      if (isArray(cc)) {
        _gl.clearColor(cc[0], cc[1], cc[2], cc[3]);
      }
    }
    _gl.clear(clearBit);

    // Blend with previous rendered scene in the final output
    // FIXME Configure blend.
    // FIXME It will cause screen blink？
    _gl[blendWithPrevious ? 'enable' : 'disable'](constants.BLEND);
    this.material && (this.material.transparent = blendWithPrevious!);

    this.renderQuad(renderer);

    this.trigger('afterrender', this, renderer);

    if (frameBuffer) {
      this.unbind(renderer, frameBuffer);
    }
  }

  /**
   * Simply do quad rendering
   */
  renderQuad(renderer: Renderer) {
    const material = this.material;
    mesh =
      mesh ||
      new Mesh(planeGeo, material, {
        frustumCulling: false
      });
    mesh.material = material;
    renderer.renderPass([mesh], camera);
  }

  /**
   * @param  {clay.Renderer} renderer
   */
  dispose(renderer: Renderer) {}
}

export default FullscreenQuadPass;
