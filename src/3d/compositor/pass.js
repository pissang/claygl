define(function(require) {

    var Base = require("core/base");
    var Scene = require("../scene");
    var OrthoCamera = require('../camera/orthographic');
    var Plane = require('../geometry/plane');
    var Shader = require('../shader');
    var Material = require('../material');
    var Mesh = require('../mesh');
    var Scene = require('../scene');
    var vertexShaderString = require("text!./shaders/vertex.essl");
    var Texture = require('../texture');
    var WebGLInfo = require('../webglinfo');

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

        bind : function(renderer, frameBuffer) {
            
            if (this.outputs) {
                for (var attachment in this.outputs) {
                    var texture = this.outputs[attachment];
                    frameBuffer.attach(renderer.gl, texture, attachment);
                }
                frameBuffer.bind(renderer);
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
    Shader.import(require('text!./shaders/grayscale.essl'));
    Shader.import(require('text!./shaders/lut.essl'));
    Shader.import(require('text!./shaders/output.essl'));

    return Pass;
})