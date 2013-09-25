define(function(require) {

    var Mesh = require('../mesh');
    var CubeGeometry = require('../geometry/cube');
    var Shader = require('../shader');
    var Material = require('../material');
    var shaderLibrary = require('../shader/library');

    var skyboxShader = shaderLibrary.get("buildin.skybox", "environmentMap");

    var Skybox = Mesh.derive(function() {

        var material = new Material({
            shader : skyboxShader,
            depthMask : false
        });
        
        return {
            geometry : new CubeGeometry(),
            material : material,

            renderer : null,
            camera : null
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
            renderer.on("beforerender:opaque", this._beforeRenderOpaque, this);
        },

        detachRenderer : function(renderer) {
            renderer.off("beforerender:opaque", this._beforeRenderOpaque, this);  
        },

        attachCamera : function(camera) {
            camera.on('afterupdate', this._afterUpdateCamera, this);
        },

        detachCamera : function(camera) {
            camera.off('afterupdate', this._afterUpdateCamera, this);
        },

        _beforeRenderOpaque : function(renderer, opaque) {
            renderer.renderQueue([this], this.camera, null, true);
        },

        _afterUpdateCamera : function(camera) {
            this.position.copy(camera.getWorldPosition());
            this.update();
        }
    });

    return Skybox;
});