import Mesh from '../Mesh';
import SphereGeometry from '../geometry/Sphere';
import Shader from '../Shader';
import Material from '../Material';

import basicEssl from '../shader/source/basic.glsl.js';
Shader.import(basicEssl);
/**
 * @constructor clay.plugin.Skydome
 *
 * @example
 *     var skyTex = new clay.Texture2D();
 *     skyTex.load('assets/textures/sky.jpg');
 *     var skydome = new clay.plugin.Skydome({
 *         scene: scene
 *     });
 *     skydome.material.set('diffuseMap', skyTex);
 */
var Skydome = Mesh.extend(function () {

    var skydomeShader = new Shader(Shader.source('clay.basic.vertex'), Shader.source('clay.basic.fragment'));

    var material = new Material({
        shader: skydomeShader,
        depthMask: false
    });
    material.enableTexture('diffuseMap');

    return {
        /**
         * @type {clay.Scene}
         * @memberOf clay.plugin.Skydome#
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
     * @param  {clay.Scene} scene
     * @memberOf clay.plugin.Skydome.prototype
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
     * @memberOf clay.plugin.Skydome.prototype
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
        renderer.renderPass([this], camera);
    },

    setEnvironmentMap: function (envMap) {
        this.material.set('diffuseMap', envMap);
    },

    getEnvironmentMap: function () {
        return this.material.get('diffuseMap');
    },

    dispose: function (renderer) {
        this.detachScene();
        this.geometry.dispose(renderer);
    }
});

export default Skydome;
