import PerspectiveCamera from '../camera/Perspective';
import Matrix4 from '../math/Matrix4';
import type ClayNode from '../Node';

const tmpProjectionMatrix = new Matrix4();

class StereoCamera {
  aspect = 0.5;

  _leftCamera = new PerspectiveCamera();

  _rightCamera = new PerspectiveCamera();

  _eyeLeft = new Matrix4();
  _eyeRight = new Matrix4();

  _frameData: any;

  updateFromCamera(camera: PerspectiveCamera, focus: number, zoom: number, eyeSep: number) {
    focus = focus == null ? 10 : focus;
    zoom = zoom == null ? 1 : zoom;
    eyeSep = eyeSep == null ? 0.064 : eyeSep;

    const fov = camera.fov;
    const aspect = camera.aspect * this.aspect;
    const near = camera.near;

    // Off-axis stereoscopic effect based on
    // http://paulbourke.net/stereographics/stereorender/

    tmpProjectionMatrix.copy(camera.projectionMatrix);
    eyeSep = eyeSep / 2;
    const eyeSepOnProjection = (eyeSep * near) / focus;
    const ymax = (near * Math.tan((Math.PI / 180) * fov * 0.5)) / zoom;
    let xmin, xmax;

    // translate xOffset
    this._eyeLeft.array[12] = -eyeSep;
    this._eyeRight.array[12] = eyeSep;

    // for left eye
    xmin = -ymax * aspect + eyeSepOnProjection;
    xmax = ymax * aspect + eyeSepOnProjection;

    tmpProjectionMatrix.array[0] = (2 * near) / (xmax - xmin);
    tmpProjectionMatrix.array[8] = (xmax + xmin) / (xmax - xmin);

    this._leftCamera.projectionMatrix.copy(tmpProjectionMatrix);

    // for right eye
    xmin = -ymax * aspect - eyeSepOnProjection;
    xmax = ymax * aspect - eyeSepOnProjection;

    tmpProjectionMatrix.array[0] = (2 * near) / (xmax - xmin);
    tmpProjectionMatrix.array[8] = (xmax + xmin) / (xmax - xmin);

    this._rightCamera.projectionMatrix.copy(tmpProjectionMatrix);

    this._leftCamera.worldTransform.copy(camera.worldTransform).multiply(this._eyeLeft);

    this._rightCamera.worldTransform.copy(camera.worldTransform).multiply(this._eyeRight);

    this._leftCamera.decomposeWorldTransform();
    this._leftCamera.decomposeProjectionMatrix();

    this._rightCamera.decomposeWorldTransform();
    this._rightCamera.decomposeProjectionMatrix();
  }

  updateFromVRDisplay(vrDisplay: any, parentNode: ClayNode) {
    // @ts-ignore
    if (typeof VRFrameData === 'undefined') {
      return;
    }

    /* global VRFrameData */
    // @ts-ignore
    const frameData = this._frameData || (this._frameData = new VRFrameData());
    vrDisplay.getFrameData(frameData);
    const leftCamera = this._leftCamera;
    const rightCamera = this._rightCamera;

    leftCamera.projectionMatrix.setArray(frameData.leftProjectionMatrix);
    leftCamera.decomposeProjectionMatrix();
    leftCamera.viewMatrix.setArray(frameData.leftViewMatrix);
    leftCamera.setViewMatrix(leftCamera.viewMatrix);

    rightCamera.projectionMatrix.setArray(frameData.rightProjectionMatrix);
    rightCamera.decomposeProjectionMatrix();
    rightCamera.viewMatrix.setArray(frameData.rightViewMatrix);
    rightCamera.setViewMatrix(rightCamera.viewMatrix);

    if (parentNode && parentNode.worldTransform) {
      leftCamera.worldTransform.multiplyLeft(parentNode.worldTransform);
      leftCamera.decomposeWorldTransform();
      rightCamera.worldTransform.multiplyLeft(parentNode.worldTransform);
      rightCamera.decomposeWorldTransform();
    }
  }

  getLeftCamera() {
    return this._leftCamera;
  }

  getRightCamera() {
    return this._rightCamera;
  }
}
export default StereoCamera;
