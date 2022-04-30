import Camera, { CameraOpts } from '../Camera';

export interface OrthographicCameraOpts extends CameraOpts {
  left: number;
  right: number;
  near: number;
  far: number;
  top: number;
  bottom: number;
}
interface OrthographicCamera extends OrthographicCameraOpts {}
/**
 * @constructor clay.camera.Orthographic
 * @extends clay.Camera
 */
class OrthographicCamera extends Camera {
  left = -1;
  right = 1;
  near = -1;
  far = 1;
  top = 1;
  bottom = -1;

  constructor(opts?: Partial<OrthographicCameraOpts>) {
    super(opts);
    Object.assign(this, opts || {});
    this.update();
  }

  updateProjectionMatrix() {
    this.projectionMatrix.ortho(this.left, this.right, this.bottom, this.top, this.near, this.far);
  }

  decomposeProjectionMatrix() {
    const m = this.projectionMatrix.array;
    this.left = (-1 - m[12]) / m[0];
    this.right = (1 - m[12]) / m[0];
    this.top = (1 - m[13]) / m[5];
    this.bottom = (-1 - m[13]) / m[5];
    this.near = -(-1 - m[14]) / m[10];
    this.far = -(1 - m[14]) / m[10];
  }
  clone() {
    const camera = super.clone.call(this);
    camera.left = this.left;
    camera.right = this.right;
    camera.near = this.near;
    camera.far = this.far;
    camera.top = this.top;
    camera.bottom = this.bottom;

    return camera;
  }
}

export default OrthographicCamera;
