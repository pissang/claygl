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
            scene : null,

            geometry : new CubeGeometry(),
            material : material,
            culling : false,

            _beforeRenderScene : function(renderer, scene, camera) {
                this.position.copy(camera.getWorldPosition());
                this.update();
                renderer.renderQueue([this], camera);
            }
        }
    }, function() {
        var scene = this.scene;
        if (scene) {
            this.attachScene(scene);
        }
    }, {
        attachScene : function(scene) {
            if (this.scene) {
                this.scene.off('beforerender', this._beforeRenderScene);
            }
            this.scene = scene;
            scene.on("beforerender", this._beforeRenderScene, this);
        },
        
        detachScene : function(scene) {
            scene.off("beforerender", this._beforeRenderScene, this);  
        }
    });

    return Skybox;
});