define(function(require) {
    
    'use strict';

    var Base = require('../core/Base');
    var OrthoCamera = require('../camera/Orthographic');
    var Plane = require('../geometry/Plane');
    var Shader = require('../Shader');
    var Material = require('../Material');
    var Mesh = require('../Mesh');
    var glinfo = require('../core/glinfo');
    var glenum = require('../core/glenum');

    Shader['import'](require('text!../shader/source/compositor/vertex.essl'));

    var planeGeo = new Plane();
    var mesh = new Mesh({
        geometry : planeGeo
    });
    var camera = new OrthoCamera();

    /**
     * @constructor qtek.compositor.Pass
     * @extends qtek.core.Base
     */
    var Pass = Base.derive(function() {
        return /** @lends qtek.compositor.Pass# */ {
            /**
             * Fragment shader string
             * @type {string}
             */
            fragment : '',

            /**
             * @type {Object}
             */
            outputs : null,

            /**
             * @type {qtek.Material}
             */
            material : null
        };
    }, function() {

        var shader = new Shader({
            vertex : Shader.source('buildin.compositor.vertex'),
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
                        frameBuffer.attach(renderer.gl, texture, attachment);
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
                var ext = glinfo.getExtension(_gl, 'EXT_draw_buffers');
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
            // Don't clear in each pass, let the color overwrite the buffer
            // PENDING Transparent ?
            _gl.disable(_gl.BLEND);
            _gl.clear(_gl.DEPTH_BUFFER_BIT);
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
        }
    });

    return Pass;
});