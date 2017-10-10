// TODO Should not derived from mesh?
import Mesh from '../Mesh';
import CubeGeometry from '../geometry/Cube';
import Shader from '../Shader';
import Material from '../Material';

import skyboxEssl from '../shader/source/skybox.glsl.js';
Shader.import(skyboxEssl);
/**
 * @constructor qtek.plugin.Skybox
 *
 * @example
 *     var skyTex = new qtek.TextureCube();
 *     skyTex.load({
 *         'px': 'assets/textures/sky/px.jpg',
 *         'nx': 'assets/textures/sky/nx.jpg'
 *         'py': 'assets/textures/sky/py.jpg'
 *         'ny': 'assets/textures/sky/ny.jpg'
 *         'pz': 'assets/textures/sky/pz.jpg'
 *         'nz': 'assets/textures/sky/nz.jpg'
 *     });
 *     var skybox = new qtek.plugin.Skybox({
 *         scene: scene
 *     });
 *     skybox.material.set('environmentMap', skyTex);
 */
var Skybox = Mesh.extend(function () {

    var skyboxShader = new Shader({
        vertex: Shader.source('qtek.skybox.vertex'),
        fragment: Shader.source('qtek.skybox.fragment')
    });
    var material = new Material({
        shader: skyboxShader,
        depthMask: false
    });

    return {
        /**
         * @type {qtek.Scene}
         * @memberOf qtek.plugin.Skybox.prototype
         */
        scene: null,

        geometry: new CubeGeometry(),

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
     * @memberOf qtek.plugin.Skybox.prototype
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
     * @memberOf qtek.plugin.Skybox.prototype
     */
    detachScene: function () {
        if (this.scene) {
            this.scene.off('beforerender', this._beforeRenderScene);
        }
        this.scene = null;
    },

    /**
     * Dispose skybox
     * @param  {qtek.Renderer} renderer
     */
    dispose: function (renderer) {
        this.detachScene();
        this.geometry.dispose(renderer);
        this.material.dispose(renderer);
    },

    setEnvironmentMap: function (envMap) {
        this.material.set('environmentMap', envMap);
    },

    getEnvironmentMap: function () {
        return this.material.get('environmentMap');
    },

    _beforeRenderScene: function(renderer, scene, camera) {
        this.renderSkybox(renderer, camera);
    },

    renderSkybox: function (renderer, camera) {
        this.position.copy(camera.getWorldPosition());
        this.update();
        // Don't remember to disable blend
        renderer.gl.disable(renderer.gl.BLEND);
        renderer.renderQueue([this], camera);
    }
});

export default Skybox;
