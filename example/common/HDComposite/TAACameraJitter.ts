import { Renderer, Camera } from 'claygl';

import halton from '../halton';

class TAACameraJitter {
  private _haltonSequence: number[][] = [];
  private _frame = 0;
  private _camera: Camera;

  constructor(camera: Camera) {
    this._camera = camera;
    for (let i = 0; i < 30; i++) {
      this._haltonSequence.push([halton(i, 2), halton(i, 3)]);
    }
    camera.updateOffset = (width, height, dpr) => {
      const offset = this._haltonSequence[this._frame % this._haltonSequence.length];
      camera.offset.setArray([
        (offset[0] * 2.0 - 1.0) / width / (dpr || 1),
        (offset[1] * 2.0 - 1.0) / height / (dpr || 1)
      ]);
    };
  }

  getSequenceFrames() {
    return this._haltonSequence.length;
  }

  /**
   * Reset accumulating frame
   */
  resetFrame() {
    this._frame = 0;
  }

  step() {
    this._frame++;
  }

  /**
   * Return current frame
   */
  getFrame() {
    return this._frame;
  }
}

export default TAACameraJitter;
