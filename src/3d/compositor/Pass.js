define(function(require) {

    var Base = require("core/Base");
    var Scene = require("../Scene");
    var OrthoCamera = require('../camera/Orthographic');
    var Plane = require('../geometry/Plane');
    var Shader = require('../Shader');
    var Material = require('../Material');
    var Mesh = require('../Mesh');
    var Scene = require('../Scene');
    var vertexShaderString = require("text!./shaders/vertex.essl");
    var Texture = require('../Texture');
    var WebGLInfo = require('../WebGLInfo');
    var glenum = require('../glenum');

    var planeGeo = new Plane();
    var mesh = new Mesh({
        geometry : planeGeo
    });
    var scene = new Scene();
    var camera = new OrthoCamera();
        
    scene.add(mesh);

    var Pass = Base.derive(function() {
        return {
            // Fragment shader string
            fragment : "",

            outputs : null,

            material : null

        }
    }, function() {

        var shader = new Shader({
            vertex : vertexShaderString,
            fragment : this.fragment
        })
        var material = new Material({
            shader : shader
        });
        shader.enableTexturesAll();

        this.material = material;

    }, {

        setUniform : function(name, value) {
            var uniform = this.material.uniforms[name];
            if (uniform) {
                uniform.value = value;
            }
        },

        getUniform : function(name) {
            var uniform = this.material.uniforms[name];
            if (uniform) {
                return uniform.value;
            }
        },

        attachOutput : function(texture, attachment) {
            if (!this.outputs) {
                this.outputs = {};
            }
            attachment = attachment || glenum.COLOR_ATTACHMENT0;
            this.outputs[attachment] = texture;
        },

        detachOutput : function(texture) {
            for (var attachment in this.outputs) {
                if (this.outputs[attachment] === texture) {
                    this.outputs[attachment] = null;
                }
            }
        },

        bind : function(renderer, frameBuffer) {
            
            if (this.outputs) {
                var haveAttachment = false;
                for (var attachment in this.outputs) {
                    var texture = this.outputs[attachment];
                    if (texture) {
                        haveAttachment = true;
                        frameBuffer.attach(renderer.gl, texture, attachment);
                    }
                }
                if (haveAttachment) {
                    frameBuffer.bind(renderer);
                }
            }
        },

        unbind : function(renderer, frameBuffer) {
            frameBuffer.unbind(renderer);
        },

        render : function(renderer, frameBuffer) {

            var _gl = renderer.gl;

            mesh.material = this.material;

            if (frameBuffer) {
                this.bind(renderer, frameBuffer);
            }

            // MRT Support in chrome
            // https://www.khronos.org/registry/webgl/sdk/tests/conformance/extensions/ext-draw-buffers.html
            var ext = WebGLInfo.getExtension(_gl, "EXT_draw_buffers");
            if (ext) {
                var bufs = [];
                for (var attachment in this.outputs) {
                    attachment = parseInt(attachment);
                    if (attachment >= _gl.COLOR_ATTACHMENT0 && attachment <= _gl.COLOR_ATTACHMENT0 + 8) {
                        bufs.push(attachment);
                    }
                }
                ext.drawBuffersEXT(bufs);
            }

            this.trigger("beforerender", this, renderer);
            renderer.render(scene, camera, true);
            this.trigger("afterrender", this, renderer);

            if (frameBuffer) {
                this.unbind(renderer, frameBuffer);
            }
        }
    })

    // Some build in shaders
    Shader.import(require('text!./shaders/coloradjust.essl'));
    Shader.import(require('text!./shaders/blur.essl'));
    Shader.import(require('text!./shaders/lum.essl'));
    Shader.import(require('text!./shaders/lut.essl'));
    Shader.import(require('text!./shaders/output.essl'));
    Shader.import(require('text!./shaders/hdr.essl'));
    Shader.import(require('text!./shaders/fxaa.essl'));

    return Pass;
})