// @ts-nocheck
import Base from '../core/Base';
import OrthoCamera from '../camera/Orthographic';
import Plane from '../geometry/Plane';
import Shader from '../Shader';
import Material from '../Material';
import Mesh from '../Mesh';
import glenum from '../core/glenum';
import vertexGlsl from '../shader/source/compositor/vertex.glsl.js';

Shader.import(vertexGlsl);

const planeGeo = new Plane();
const mesh = new Mesh({
  geometry: planeGeo,
  frustumCulling: false
});
const camera = new OrthoCamera();

/**
 * @constructor clay.compositor.Pass
 * @extends clay.core.Base
 */
const Pass = Base.extend(
  function () {
    return /** @lends clay.compositor.Pass# */ {
      /**
       * Fragment shader string
       * @type {string}
       */
      // PENDING shader or fragment ?
      fragment: '',

      /**
       * @type {Object}
       */
      outputs: null,

      /**
       * @type {clay.Material}
       */
      material: null,

      /**
       * @type {Boolean}
       */
      blendWithPrevious: false,

      /**
       * @type {Boolean}
       */
      clearColor: false,

      /**
       * @type {Boolean}
       */
      clearDepth: true
    };
  },
  function () {
    const shader = new Shader(Shader.source('clay.compositor.vertex'), this.fragment);
    const material = new Material({
      shader: shader
    });
    material.enableTexturesAll();

    this.material = material;
  },
  /** @lends clay.compositor.Pass.prototype */
  {
    /**
     * @param {string} name
     * @param {} value
     */
    setUniform: function (name, value) {
      this.material.setUniform(name, value);
    },
    /**
     * @param  {string} name
     * @return {}
     */
    getUniform: function (name) {
      const uniform = this.material.uniforms[name];
      if (uniform) {
        return uniform.value;
      }
    },
    /**
     * @param  {clay.Texture} texture
     * @param  {number} attachment
     */
    attachOutput: function (texture, attachment) {
      if (!this.outputs) {
        this.outputs = {};
      }
      attachment = attachment || glenum.COLOR_ATTACHMENT0;
      this.outputs[attachment] = texture;
    },
    /**
     * @param  {clay.Texture} texture
     */
    detachOutput: function (texture) {
      for (const attachment in this.outputs) {
        if (this.outputs[attachment] === texture) {
          this.outputs[attachment] = null;
        }
      }
    },

    bind: function (renderer, frameBuffer) {
      if (this.outputs) {
        for (const attachment in this.outputs) {
          const texture = this.outputs[attachment];
          if (texture) {
            frameBuffer.attach(texture, attachment);
          }
        }
      }

      if (frameBuffer) {
        frameBuffer.bind(renderer);
      }
    },

    unbind: function (renderer, frameBuffer) {
      frameBuffer.unbind(renderer);
    },
    /**
     * @param  {clay.Renderer} renderer
     * @param  {clay.FrameBuffer} [frameBuffer]
     */
    render: function (renderer, frameBuffer) {
      const _gl = renderer.gl;

      if (frameBuffer) {
        this.bind(renderer, frameBuffer);
        // MRT Support in chrome
        // https://www.khronos.org/registry/webgl/sdk/tests/conformance/extensions/ext-draw-buffers.html
        const ext = renderer.getGLExtension('EXT_draw_buffers');
        if (ext && this.outputs) {
          const bufs = [];
          for (let attachment in this.outputs) {
            attachment = +attachment;
            if (attachment >= _gl.COLOR_ATTACHMENT0 && attachment <= _gl.COLOR_ATTACHMENT0 + 8) {
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
    },

    /**
     * Simply do quad rendering
     */
    renderQuad: function (renderer) {
      mesh.material = this.material;
      renderer.renderPass([mesh], camera);
    },

    /**
     * @param  {clay.Renderer} renderer
     */
    dispose: function (renderer) {}
  }
);

export default Pass;
