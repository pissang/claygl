// TODO Should not derived from mesh?
import Mesh from '../Mesh';
import CubeGeometry from '../geometry/Cube';
import Shader from '../Shader';
import Material from '../Material';
import Texture from '../Texture';
import PerspectiveCamera from '../camera/Perspective';
import Matrix4 from '../math/Matrix4';

import skyboxEssl from '../shader/source/skybox.glsl.js';
Shader.import(skyboxEssl);
/**
 * @constructor clay.plugin.Skybox
 *
 * @example
 *     var skyTex = new clay.TextureCube();
 *     skyTex.load({
 *         'px': 'assets/textures/sky/px.jpg',
 *         'nx': 'assets/textures/sky/nx.jpg'
 *         'py': 'assets/textures/sky/py.jpg'
 *         'ny': 'assets/textures/sky/ny.jpg'
 *         'pz': 'assets/textures/sky/pz.jpg'
 *         'nz': 'assets/textures/sky/nz.jpg'
 *     });
 *     var skybox = new clay.plugin.Skybox({
 *         scene: scene
 *     });
 *     skybox.material.set('environmentMap', skyTex);
 */
var Skybox = Mesh.extend(function () {

    var skyboxShader = new Shader({
        vertex: Shader.source('clay.skybox.vertex'),
        fragment: Shader.source('clay.skybox.fragment')
    });
    var material = new Material({
        shader: skyboxShader,
        depthMask: false
    });

    return {
        /**
         * @type {clay.Scene}
         * @memberOf clay.plugin.Skybox.prototype
         */
        scene: null,

        geometry: new CubeGeometry(),

        material: material,

        environmentMap: null,

        culling: false,

        _dummyCamera: new PerspectiveCamera()
    };
}, function () {
    var scene = this.scene;
    if (scene) {
        this.attachScene(scene);
    }
    if (this.environmentMap) {
        this.setEnvironmentMap(this.environmentMap);
    }
}, /** @lends clay.plugin.Skybox# */ {
    /**
     * Attach the skybox to the scene
     * @param  {clay.Scene} scene
     */
    attachScene: function (scene) {
        if (this.scene) {
            this.detachScene();
        }
        scene.skybox = this;

        this.scene = scene;
        scene.on('beforerender', this._beforeRenderScene, this);
    },
    /**
     * Detach from scene
     */
    detachScene: function () {
        if (this.scene) {
            this.scene.off('beforerender', this._beforeRenderScene);
            this.scene.skybox = null;
        }
        this.scene = null;
    },

    /**
     * Dispose skybox
     * @param  {clay.Renderer} renderer
     */
    dispose: function (renderer) {
        this.detachScene();
        this.geometry.dispose(renderer);
    },
    /**
     * Set environment map
     * @param {clay.TextureCube} envMap
     */
    setEnvironmentMap: function (envMap) {
        if (envMap.textureType === 'texture2D') {
            this.material.define('EQUIRECTANGULAR');
            // LINEAR filter can remove the artifacts in pole
            envMap.minFilter = Texture.LINEAR;
        }
        else {
            this.material.undefine('EQUIRECTANGULAR');
        }
        this.material.set('environmentMap', envMap);
    },
    /**
     * Get environment map
     * @return {clay.TextureCube}
     */
    getEnvironmentMap: function () {
        return this.material.get('environmentMap');
    },

    _beforeRenderScene: function(renderer, scene, camera) {
        this.renderSkybox(renderer, camera);
    },

    renderSkybox: function (renderer, camera) {
        var dummyCamera = this._dummyCamera;
        dummyCamera.aspect = renderer.getViewportAspect();
        dummyCamera.fov = camera.fov || 50;
        dummyCamera.updateProjectionMatrix();
        Matrix4.invert(dummyCamera.invProjectionMatrix, dummyCamera.projectionMatrix);
        dummyCamera.worldTransform.copy(camera.worldTransform);
        dummyCamera.viewMatrix.copy(camera.viewMatrix);

        this.position.copy(camera.getWorldPosition());
        this.update();

        // Don't remember to disable blend
        renderer.gl.disable(renderer.gl.BLEND);
        if (this.material.get('lod') > 0) {
            this.material.define('fragment', 'LOD');
        }
        else {
            this.material.undefine('fragment', 'LOD');
        }
        renderer.renderPass([this], dummyCamera);
    }
});

export default Skybox;
