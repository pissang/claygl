// TODO Should not derived from mesh?
import Mesh, { MeshOpts } from '../Mesh';
import CubeGeometry from '../geometry/Cube';
import Material from '../Material';
import PerspectiveCamera from '../camera/Perspective';
import Matrix4 from '../math/Matrix4';

import type Scene from '../Scene';
import type TextureCube from '../TextureCube';
import type Renderer from '../Renderer';
import type Texture2D from '../Texture2D';
import type Camera from '../Camera';
import SkyboxShader from '../shader/SkyboxShader';
import * as constants from '../core/constants';

const sceneSkyboxMap = new WeakMap<Scene, Skybox>();
interface SkyboxOpts extends MeshOpts {
  scene?: Scene;
  environmentMap?: TextureCube | Texture2D;

  material: Material;
}
/**
 * @constructor clay.plugin.Skybox
 *
 * @example
 *     const skyTex = new clay.TextureCube();
 *     skyTex.load({
 *         'px': 'assets/textures/sky/px.jpg',
 *         'nx': 'assets/textures/sky/nx.jpg'
 *         'py': 'assets/textures/sky/py.jpg'
 *         'ny': 'assets/textures/sky/ny.jpg'
 *         'pz': 'assets/textures/sky/pz.jpg'
 *         'nz': 'assets/textures/sky/nz.jpg'
 *     });
 *     const skybox = new clay.plugin.Skybox({
 *         scene: scene
 *     });
 *     skybox.material.set('environmentMap', skyTex);
 */
class Skybox extends Mesh {
  culling = false;

  private _targetScene?: Scene;
  private _environmentMap?: TextureCube | Texture2D;
  private _dummyCamera = new PerspectiveCamera();

  material: Material<SkyboxShader>;

  constructor(opts?: Partial<SkyboxOpts>) {
    super(opts);
    this.geometry = new CubeGeometry();
    this.material =
      (opts && opts.material) ||
      new Material(new SkyboxShader(), {
        depthMask: false
      });

    opts = opts || {};
    if (opts.scene) {
      this.attachScene(opts.scene);
    }
    if (opts.environmentMap) {
      this.setEnvironmentMap(opts.environmentMap);
    }
  }

  attachScene(scene: Scene) {
    if (this._targetScene) {
      this.detachScene();
    }
    sceneSkyboxMap.set(scene, this);

    this._targetScene = scene;
    scene.on('beforerender', this._beforeRenderScene, this);
  }
  /**
   * Detach from scene
   */
  detachScene() {
    const scene = this._targetScene;
    if (scene) {
      scene.off('beforerender', this._beforeRenderScene);
      sceneSkyboxMap.delete(scene);
    }
    this._targetScene = undefined;
  }

  getScene() {
    return this._targetScene;
  }

  /**
   * Dispose skybox
   * @param  {clay.Renderer} renderer
   */
  dispose(renderer: Renderer) {
    this.detachScene();
    this.geometry.dispose(renderer);
  }
  /**
   * Set environment map
   * @param {clay.TextureCube} envMap
   */
  setEnvironmentMap(envMap: Texture2D | TextureCube) {
    const material = this.material;
    if (envMap.textureType === 'texture2D') {
      material.define('EQUIRECTANGULAR');
      // LINEAR filter can remove the artifacts in pole
      envMap.minFilter = constants.LINEAR;
      material.uniforms.equirectangularMap.value = envMap;
    } else {
      material.undefine('EQUIRECTANGULAR');
      material.uniforms.cubeMap.value = envMap;
    }
  }
  /**
   * Get environment map
   * @return {clay.TextureCube}
   */
  getEnvironmentMap() {
    return this.material.get('environmentMap');
  }

  _beforeRenderScene(renderer: Renderer, scene: Scene, camera: Camera) {
    this.renderSkybox(renderer, camera);
  }

  renderSkybox(renderer: Renderer, camera: Camera) {
    const dummyCamera = this._dummyCamera;
    const material = this.material;
    dummyCamera.aspect = renderer.getViewportAspect();
    dummyCamera.fov = (camera as PerspectiveCamera).fov || 50;
    dummyCamera.updateProjectionMatrix();
    Matrix4.invert(dummyCamera.invProjectionMatrix, dummyCamera.projectionMatrix);
    dummyCamera.worldTransform.copy(camera.worldTransform);
    dummyCamera.viewMatrix.copy(camera.viewMatrix);

    this.position.copy(camera.getWorldPosition());
    this.update();

    // Don't remember to disable blend
    renderer.gl.disable(renderer.gl.BLEND);
    if (material.get('lod')! > 0) {
      material.define('fragment', 'LOD');
    } else {
      material.undefine('fragment', 'LOD');
    }
    renderer.renderPass([this], dummyCamera);
  }

  static getSceneSkybox(scene: Scene) {
    return sceneSkyboxMap.get(scene);
  }
}

export default Skybox;
