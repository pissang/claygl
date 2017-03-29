define(function (require) {

    var Mesh = require('../Mesh');
    var SphereGeometry = require('../geometry/Sphere');
    var Shader = require('../Shader');
    var Material = require('../Material');

    Shader.import(require('../shader/source/basic.essl'));
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
    var Skydome = Mesh.extend(function () {

        var skydomeShader = new Shader({
            vertex: Shader.source('qtek.basic.vertex'),
            fragment: Shader.source('qtek.basic.fragment')
        });
        skydomeShader.enableTexture('diffuseMap');

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

            environmentMap: null,

            culling: false
        };
    }, function () {
        var scene = this.scene;
        if (scene) {
            this.attachScene(scene);
        }

        if (this.environmentMap) {
            this.setEnvironmentMap(this.environmentMap);
        }
    }, {
        /**
         * Attach the skybox to the scene
         * @param  {qtek.Scene} scene
         * @memberOf qtek.plugin.Skydome.prototype
         */
        attachScene: function (scene) {
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
        detachScene: function () {
            if (this.scene) {
                this.scene.off('beforerender', this._beforeRenderScene);
            }
            this.scene = null;
        },

        _beforeRenderScene: function (renderer, scene, camera) {
            this.position.copy(camera.getWorldPosition());
            this.update();
            renderer.renderQueue([this], camera);
        },

        setEnvironmentMap: function (envMap) {
            this.material.set('diffuseMap', envMap);
        },

        getEnvironmentMap: function () {
            return this.material.get('diffuseMap');
        },

        dispose: function (gl) {
            this.detachScene();
            this.geometry.dispose(gl);
            this.material.dispose(gl);
        }
    });

    return Skydome;
});