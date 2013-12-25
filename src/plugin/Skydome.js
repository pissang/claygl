define(function(require) {

    var Mesh = require('../Mesh');
    var SphereGeometry = require('../geometry/Sphere');
    var Shader = require('../Shader');
    var Material = require('../Material');
    var shaderLibrary = require('../shader/library');

    var Skydome = Mesh.derive(function() {

        var skydomeShader = new Shader({
            vertex : Shader.source("buildin.basic.vertex"),
            fragment : Shader.source("buildin.basic.fragment")
        });
        skydomeShader.enableTexture("diffuseMap");

        var material = new Material({
            shader : skydomeShader,
            depthMask : false
        });
        
        return {
            scene : null,

            geometry : new SphereGeometry({
                widthSegments : 30,
                heightSegments : 30,
                // thetaLength : Math.PI / 2
            }),
            material : material,
            culling : false,

            _beforeRenderScene : function(renderer, scene, camera) {
                this.position.copy(camera.getWorldPosition());
                this.update();
                renderer.renderQueue([this], camera);
                renderer.gl.clear(renderer.gl.DEPTH_BUFFER_BIT);
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

    return Skydome;
});