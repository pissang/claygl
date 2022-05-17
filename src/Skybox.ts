// TODO Should not derived from mesh?
import Mesh, { MeshOpts } from './Mesh';
import CubeGeometry from './geometry/Cube';
import Material from './Material';
import PerspectiveCamera from './camera/Perspective';

import type Scene from './Scene';
import type TextureCube from './TextureCube';
import type Texture2D from './Texture2D';
import * as constants from './core/constants';
import Shader from './Shader';
import { skyboxFragment, skyboxVertex } from './shader/source/skybox.glsl';

interface SkyboxOpts extends MeshOpts {
  environmentMap?: TextureCube | Texture2D;
}

function createSkyboxShader() {
  return new Shader(skyboxVertex, skyboxFragment);
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
class Skybox extends Mesh<Material<ReturnType<typeof createSkyboxShader>>> {
  culling = false;

  constructor(opts?: Partial<SkyboxOpts>) {
    super(
      new CubeGeometry(),
      new Material(createSkyboxShader(), {
        depthMask: false
      }),
      opts
    );

    opts = opts || {};
    if (opts.environmentMap) {
      this.setEnvironmentMap(opts.environmentMap);
    }
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

  update() {
    const material = this.material;
    if (material.get('lod')! > 0) {
      material.define('fragment', 'LOD');
    } else {
      material.undefine('fragment', 'LOD');
    }
  }
}

export default Skybox;
