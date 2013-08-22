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
        var skybox = this;
        var camera = this.camera;
        var renderer = this.renderer;
        if (renderer) {
            renderer.on("beforerender:opaque", function() {
                this.renderQueue([skybox], camera, null, true);
            });
        }
        if (camera) {
            camera.on("afterupdate", function() {
                skybox.position.copy(this.getWorldPosition());
                skybox.update();
            });
        }
    });

    return Skybox;
});