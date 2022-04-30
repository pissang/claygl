import Vector3 from '../math/Vector3';
import PerspectiveCamera from '../camera/Perspective';
import FrameBuffer from '../FrameBuffer';
import TextureCube, { CubeTarget, cubeTargets } from '../TextureCube';

import type ShadowMapPass from './ShadowMap';
import type Renderer from '../Renderer';
import type Scene from '../Scene';

interface EnvironmentMapPassOpts {
  /**
   * Camera position
   */
  position: Vector3;
  /**
   * Camera far plane
   */
  far: number;
  /**
   * Camera near plane
   */
  near: number;
  /**
   * Environment cube map
   */
  texture: TextureCube;

  /**
   * Used if you wan't have shadow in environment map
   */
  shadowMapPass: ShadowMapPass;
}
/**
 * Pass rendering scene to a environment cube map
 *
 * @example
 *     // Example of car reflection
 *     const envMap = new clay.TextureCube({
 *         width: 256,
 *         height: 256
 *     });
 *     const envPass = new clay.prePass.EnvironmentMap({
 *         position: car.position,
 *         texture: envMap
 *     });
 *     const carBody = car.getChildByName('body');
 *     carBody.material.enableTexture('environmentMap');
 *     carBody.material.set('environmentMap', envMap);
 *     ...
 *     animation.on('frame', function(frameTime) {
 *         envPass.render(renderer, scene);
 *         renderer.render(scene, camera);
 *     });
 */
class EnvironmentMapPass {
  /**
   * Camera position
   */
  position = new Vector3();
  /**
   * Camera far plane
   */
  far = 1000;
  /**
   * Camera near plane
   */
  near = 0.1;
  /**
   * Environment cube map
   */
  texture?: TextureCube;

  /**
   * Used if you wan't have shadow in environment map
   */
  shadowMapPass?: ShadowMapPass;

  private _cameras: Record<CubeTarget, PerspectiveCamera>;
  private _frameBuffer: FrameBuffer;

  constructor(opts?: Partial<EnvironmentMapPassOpts>) {
    Object.assign(this, opts);

    const cameras = (this._cameras = cubeTargets.reduce((obj, target) => {
      obj[target] = new PerspectiveCamera({ fov: 90 });
      return obj;
    }, {} as Record<CubeTarget, PerspectiveCamera>));

    cameras.px.lookAt(Vector3.POSITIVE_X, Vector3.NEGATIVE_Y);
    cameras.nx.lookAt(Vector3.NEGATIVE_X, Vector3.NEGATIVE_Y);
    cameras.py.lookAt(Vector3.POSITIVE_Y, Vector3.POSITIVE_Z);
    cameras.ny.lookAt(Vector3.NEGATIVE_Y, Vector3.NEGATIVE_Z);
    cameras.pz.lookAt(Vector3.POSITIVE_Z, Vector3.NEGATIVE_Y);
    cameras.nz.lookAt(Vector3.NEGATIVE_Z, Vector3.NEGATIVE_Y);

    // FIXME In windows, use one framebuffer only renders one side of cubemap
    this._frameBuffer = new FrameBuffer();
  }
  getCamera(target: CubeTarget) {
    return this._cameras[target];
  }
  render(renderer: Renderer, scene: Scene, notUpdateScene?: boolean) {
    const _gl = renderer.gl;
    const texture = this.texture;
    if (!notUpdateScene) {
      scene.update();
    }
    if (!texture) {
      console.error('texture not provided');
      return;
    }
    // Tweak fov
    // http://the-witness.net/news/2012/02/seamless-cube-map-filtering/
    const n = texture.width;
    const fov = ((2 * Math.atan(n / (n - 0.5))) / Math.PI) * 180;

    for (let i = 0; i < 6; i++) {
      const target = cubeTargets[i];
      const camera = this._cameras[target];
      Vector3.copy(camera.position, this.position);

      camera.far = this.far;
      camera.near = this.near;
      camera.fov = fov;

      if (this.shadowMapPass) {
        camera.update();

        // update boundingBoxLastFrame
        const bbox = scene.getBoundingBox();
        bbox.applyTransform(camera.viewMatrix);
        scene.viewBoundingBoxLastFrame.copy(bbox);

        this.shadowMapPass.render(renderer, scene, camera, true);
      }
      this._frameBuffer.attach(texture, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i);
      this._frameBuffer.bind(renderer);
      renderer.render(scene, camera, true);
      this._frameBuffer.unbind(renderer);
    }
  }
  dispose(renderer: Renderer) {
    this._frameBuffer.dispose(renderer);
  }
}
export default EnvironmentMapPass;
