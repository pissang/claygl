import OrthoCamera from '../camera/Orthographic';
import Plane from '../geometry/Plane';
import Shader from '../Shader';
import Material from '../Material';
import Mesh from '../Mesh';
import glenum from '../core/glenum';
import vertexGlsl from '../shader/source/compositor/vertex.glsl.js';
import { GLEnum } from '../core/type';
import { optional } from '../core/util';
import type Renderer from '../Renderer';
import type FrameBuffer from '../FrameBuffer';
import type Texture2D from '../Texture2D';
import Notifier from '../core/Notifier';

Shader.import(vertexGlsl);

const planeGeo = new Plane();
const mesh = new Mesh({
  geometry: planeGeo,
  frustumCulling: false
});
const camera = new OrthoCamera();

interface CompositorFullscreenQuadPassOpts {
  clearColor?: boolean;
  clearDepth?: boolean;
  blendWithPrevious?: boolean;
}

class CompositorFullscreenQuadPass extends Notifier {
  material: Material;

  clearColor?: boolean;
  clearDepth?: boolean;
  blendWithPrevious?: boolean;

  outputs: Record<string, Texture2D | undefined> = {};

  constructor(fragment: string, opts?: Partial<CompositorFullscreenQuadPassOpts>) {
    super();

    const shader = new Shader(Shader.source('clay.compositor.vertex'), fragment);
    const material = new Material({
      shader: shader
    });
    material.enableTexturesAll();
    this.material = material;

    opts = opts || {};
    this.clearColor = opts.clearColor || false;
    this.blendWithPrevious = opts.blendWithPrevious || false;
    this.clearDepth = optional(opts.clearColor, true);
  }

  setUniform(name: string, value: any) {
    this.material.setUniform(name, value);
  }
  getUniform(name: string) {
    const uniform = this.material.uniforms[name];
    if (uniform) {
      return uniform.value;
    }
  }
  attachOutput(texture: Texture2D, attachment?: GLEnum) {
    if (!this.outputs) {
      this.outputs = {};
    }
    attachment = attachment || glenum.COLOR_ATTACHMENT0;
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

  render(renderer: Renderer, frameBuffer: FrameBuffer) {
    const _gl = renderer.gl;

    if (frameBuffer) {
      this.bind(renderer, frameBuffer);
      // MRT Support in chrome
      // https://www.khronos.org/registry/webgl/sdk/tests/conformance/extensions/ext-draw-buffers.html
      const ext = renderer.getGLExtension('EXT_draw_buffers');
      if (ext && this.outputs) {
        const bufs = [];
        for (const attachment in this.outputs) {
          if (+attachment >= _gl.COLOR_ATTACHMENT0 && +attachment <= _gl.COLOR_ATTACHMENT0 + 8) {
            bufs.push(attachment);
          }
        }
        ext.drawBuffersEXT(bufs);
      }
    }

    this.trigger('beforerender', this, renderer);

    // FIXME Don't clear in each pass in default, let the color overwrite the buffer
    // FIXME pixels may be discard
    let clearBit = this.clearDepth ? _gl.DEPTH_BUFFER_BIT : 0;
    _gl.depthMask(true);
    if (this.clearColor) {
      clearBit = clearBit | _gl.COLOR_BUFFER_BIT;
      _gl.colorMask(true, true, true, true);
      const cc = this.clearColor;
      if (Array.isArray(cc)) {
        _gl.clearColor(cc[0], cc[1], cc[2], cc[3]);
      }
    }
    _gl.clear(clearBit);

    if (this.blendWithPrevious) {
      // Blend with previous rendered scene in the final output
      // FIXME Configure blend.
      // FIXME It will cause screen blink？
      _gl.enable(_gl.BLEND);
      this.material.transparent = true;
    } else {
      _gl.disable(_gl.BLEND);
      this.material.transparent = false;
    }

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
    mesh.material = this.material;
    renderer.renderPass([mesh], camera);
  }

  /**
   * @param  {clay.Renderer} renderer
   */
  dispose(renderer: Renderer) {}
}

export default CompositorFullscreenQuadPass;
