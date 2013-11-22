define(function(require) {

    var Mesh = require('../Mesh');
    var CubeGeometry = require('../geometry/Cube');
    var Shader = require('../Shader');
    var Material = require('../Material');
    var shaderLibrary = require('../shader/library');

    var skyboxShader = new Shader({
        vertex : Shader.source("buildin.skybox.vertex"), 
        fragment : Shader.source("buildin.skybox.fragment")
    });

    var Skybox = Mesh.derive(function() {

        var material = new Material({
            shader : skyboxShader,
            depthMask : false
        });
        
        return {
            renderer : null,
            camera : null,

            geometry : new CubeGeometry(),
            material : material,
            culling : false,

            _beforeRenderOpaque : function(renderer, opaque) {
                renderer.renderQueue([this], this.camera, null, true);
            },

            _afterUpdateCamera : function(camera) {
                this.position.copy(camera.getWorldPosition());
                this.update();
            }
        }
    }, function() {
        var camera = this.camera;
        var renderer = this.renderer;
        if (renderer) {
            this.attachRenderer(renderer);
        }
        if (camera) {
            this.attachCamera(camera);
        }
    }, {
        attachRenderer : function(renderer) {
            if (this.renderer) {
                this.renderer.off('afterupdate', this._afterUpdateCamera);
            }
            this.renderer = renderer;
            renderer.on("beforerender:opaque", this._beforeRenderOpaque, this);
        },

        detachRenderer : function(renderer) {
            renderer.off("beforerender:opaque", this._beforeRenderOpaque, this);  
        },

        attachCamera : function(camera) {
            if (this.camera) {
                this.camera.off('afterupdate', this._afterUpdateCamera);
            }
            this.camera = camera;
            camera.on('afterupdate', this._afterUpdateCamera, this);
        },

        detachCamera : function(camera) {
            camera.off('afterupdate', this._afterUpdateCamera, this);
        }
    });

    return Skybox;
});