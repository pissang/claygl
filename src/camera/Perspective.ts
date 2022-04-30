// @ts-nocheck
import Camera, { CameraOpts } from '../Camera';

export interface PerspectiveCameraOpts extends CameraOpts {
  /**
   * Vertical field of view in degrees
   */
  fov: number;
  /**
   * Aspect ratio, typically viewport width / height
   */
  aspect: number;
  /**
   * Near bound of the frustum
   */
  near: number;
  /**
   * Far bound of the frustum
   */
  far: number;
}
interface PerspectiveCamera extends PerspectiveCameraOpts {}

class PerspectiveCamera extends Camera {
  fov = 50;
  aspect = 1;
  near = 0.1;
  far = 2000;

  constructor(opts?: Partial<PerspectiveCameraOpts>) {
    super(opts);
    Object.assign(this, opts);
    this.update();
  }

  updateProjectionMatrix() {
    const rad = (this.fov / 180) * Math.PI;
    this.projectionMatrix.perspective(rad, this.aspect, this.near, this.far);
  }
  decomposeProjectionMatrix() {
    const m = this.projectionMatrix.array;
    const rad = Math.atan(1 / m[5]) * 2;
    this.fov = (rad / Math.PI) * 180;
    this.aspect = m[5] / m[0];
    this.near = m[14] / (m[10] - 1);
    this.far = m[14] / (m[10] + 1);
  }
  /**
   * @return {clay.camera.Perspective}
   */
  clone() {
    const camera = super.clone.call(this);
    camera.fov = this.fov;
    camera.aspect = this.aspect;
    camera.near = this.near;
    camera.far = this.far;

    return camera;
  }
}

export default PerspectiveCamera;
