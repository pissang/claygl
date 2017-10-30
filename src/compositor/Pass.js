import Base from '../core/Base';
import OrthoCamera from '../camera/Orthographic';
import Plane from '../geometry/Plane';
import Shader from '../Shader';
import Material from '../Material';
import Mesh from '../Mesh';
import glenum from '../core/glenum';
import vertexEssl from '../shader/source/compositor/vertex.glsl.js';

Shader['import'](vertexEssl);

var planeGeo = new Plane();
var mesh = new Mesh({
    geometry: planeGeo,
    frustumCulling: false
});
var camera = new OrthoCamera();

/**
 * @constructor qtek.compositor.Pass
 * @extends qtek.core.Base
 */
var Pass = Base.extend(function () {
    return /** @lends qtek.compositor.Pass# */ {
        /**
         * Fragment shader string
         * @type {string}
         */
        // PENDING shader or fragment ?
        fragment : '',

        /**
         * @type {Object}
         */
        outputs : null,

        /**
         * @type {qtek.Material}
         */
        material : null,

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
}, function() {

    var shader = new Shader({
        vertex : Shader.source('qtek.compositor.vertex'),
        fragment : this.fragment
    });
    var material = new Material({
        shader : shader
    });
    shader.enableTexturesAll();

    this.material = material;

},
/** @lends qtek.compositor.Pass.prototype */
{
    /**
     * @param {string} name
     * @param {} value
     */
    setUniform : function(name, value) {
        var uniform = this.material.uniforms[name];
        if (uniform) {
            uniform.value = value;
        }
    },
    /**
     * @param  {string} name
     * @return {}
     */
    getUniform : function(name) {
        var uniform = this.material.uniforms[name];
        if (uniform) {
            return uniform.value;
        }
    },
    /**
     * @param  {qtek.Texture} texture
     * @param  {number} attachment
     */
    attachOutput : function(texture, attachment) {
        if (!this.outputs) {
            this.outputs = {};
        }
        attachment = attachment || glenum.COLOR_ATTACHMENT0;
        this.outputs[attachment] = texture;
    },
    /**
     * @param  {qtek.Texture} texture
     */
    detachOutput : function(texture) {
        for (var attachment in this.outputs) {
            if (this.outputs[attachment] === texture) {
                this.outputs[attachment] = null;
            }
        }
    },

    bind : function(renderer, frameBuffer) {

        if (this.outputs) {
            for (var attachment in this.outputs) {
                var texture = this.outputs[attachment];
                if (texture) {
                    frameBuffer.attach(texture, attachment);
                }
            }
        }

        if (frameBuffer) {
            frameBuffer.bind(renderer);
        }
    },

    unbind : function(renderer, frameBuffer) {
        frameBuffer.unbind(renderer);
    },
    /**
     * @param  {qtek.Renderer} renderer
     * @param  {qtek.FrameBuffer} [frameBuffer]
     */
    render : function(renderer, frameBuffer) {

        var _gl = renderer.gl;

        if (frameBuffer) {
            this.bind(renderer, frameBuffer);
            // MRT Support in chrome
            // https://www.khronos.org/registry/webgl/sdk/tests/conformance/extensions/ext-draw-buffers.html
            var ext = renderer.getGLExtension('EXT_draw_buffers');
            if (ext && this.outputs) {
                var bufs = [];
                for (var attachment in this.outputs) {
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
        var clearBit = this.clearDepth ? _gl.DEPTH_BUFFER_BIT : 0;
        _gl.depthMask(true);
        if (this.clearColor) {
            clearBit = clearBit | _gl.COLOR_BUFFER_BIT;
            _gl.colorMask(true, true, true, true);
            var cc = this.clearColor;
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
        }
        else {
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
        renderer.renderQueue([mesh], camera);
    },

    /**
     * @param  {qtek.Renderer} renderer
     */
    dispose: function (renderer) {
        this.material.dispose(renderer);
    }
});

export default Pass;
