import { Camera, Matrix4, Renderer } from 'claygl';

import halton from '../halton';

class TAACameraJitter {
  private _haltonSequence: number[][] = [];
  private _frame = 0;

  constructor(renderer: Renderer, camera: Camera) {
    for (let i = 0; i < 30; i++) {
      this._haltonSequence.push([halton(i, 2), halton(i, 3)]);
    }

    const oldUpdateProjectionMatrix = camera.updateProjectionMatrix;
    // Hook the updateProjectionMatrix
    camera.updateProjectionMatrix = () => {
      oldUpdateProjectionMatrix.call(camera);
      this._jitterProjection(renderer, camera);
      this._frame++;
    };
  }

  private _jitterProjection(renderer: Renderer, camera: Camera) {
    const offset = this._haltonSequence[this._frame % this._haltonSequence.length];
    const viewport = renderer.viewport;
    const dpr = viewport.devicePixelRatio || renderer.getDevicePixelRatio();
    const width = viewport.width * dpr;
    const height = viewport.height * dpr;

    const translationMat = new Matrix4();
    translationMat.array[12] = (offset[0] * 2.0 - 1.0) / width;
    translationMat.array[13] = (offset[1] * 2.0 - 1.0) / height;
    Matrix4.mul(camera.projectionMatrix, translationMat, camera.projectionMatrix);
    Matrix4.invert(camera.invProjectionMatrix, camera.projectionMatrix);
  }

  getJitterOffset(renderer: Renderer) {
    const offset = this._haltonSequence[this._frame % this._haltonSequence.length];
    const viewport = renderer.viewport;
    const dpr = viewport.devicePixelRatio || renderer.getDevicePixelRatio();
    const width = viewport.width * dpr;
    const height = viewport.height * dpr;

    return [offset[0] / width, offset[1] / height];
  }

  /**
   * Reset accumulating frame
   */
  resetFrame() {
    this._frame = 0;
  }

  /**
   * Return current frame
   */
  getFrame() {
    return this._frame;
  }
}

export default TAACameraJitter;
