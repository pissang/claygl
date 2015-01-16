define(function(require) {

    var Mesh = require('../Mesh');
    var SphereGeometry = require('../geometry/Sphere');
    var Shader = require('../Shader');
    var Material = require('../Material');
    var shaderLibrary = require('../shader/library');

    var skydomeShader;

    /**
     * @constructor qtek.plugin.Skydome
     *
     * @example
     *     var skyTex = new qtek.Texture2D();
     *     skyTex.load('assets/textures/sky.jpg');
     *     var skydome = new qtek.plugin.Skydome({
     *         scene: scene
     *     });
     *     skydome.material.set('diffuseMap', skyTex);
     */
    var Skydome = Mesh.derive(function() {

        if (!skydomeShader) {
            skydomeShader = new Shader({
                vertex: Shader.source('buildin.basic.vertex'),
                fragment: Shader.source('buildin.basic.fragment')
            });
            skydomeShader.enableTexture('diffuseMap');
        }

        var material = new Material({
            shader: skydomeShader,
            depthMask: false
        });
        
        return {
            /**
             * @type {qtek.Scene}
             * @memberOf qtek.plugin.Skydome#
             */
            scene: null,

            geometry: new SphereGeometry({
                widthSegments: 30,
                heightSegments: 30,
                // thetaLength: Math.PI / 2
            }),
            material: material,
            culling: false
        };
    }, function() {
        var scene = this.scene;
        if (scene) {
            this.attachScene(scene);
        }
    }, {
        /**
         * Attach the skybox to the scene
         * @param  {qtek.Scene} scene
         * @memberOf qtek.plugin.Skydome.prototype
         */
        attachScene: function(scene) {
            if (this.scene) {
                this.detachScene();
            }
            this.scene = scene;
            scene.on('beforerender', this._beforeRenderScene, this);
        },
        /**
         * Detach from scene
         * @memberOf qtek.plugin.Skydome.prototype
         */
        detachScene: function() {
            if (this.scene) {
                this.scene.off('beforerender', this._beforeRenderScene, this);  
            }
            this.scene = null;
        },

        _beforeRenderScene: function(renderer, scene, camera) {
            this.position.copy(camera.getWorldPosition());
            this.update();
            renderer.renderQueue([this], camera);
        },

        dispose: function() {
            this.detachScene();
        }
    });

    return Skydome;
});