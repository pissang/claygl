import { Renderer } from 'claygl';

import halton from '../halton';

class TAACameraJitter {
  private _haltonSequence: number[][] = [];
  private _frame = 0;

  constructor() {
    for (let i = 0; i < 30; i++) {
      this._haltonSequence.push([halton(i, 2), halton(i, 3)]);
    }
  }

  getJitterOffset(renderer: Renderer): [number, number] {
    const offset = this._haltonSequence[this._frame % this._haltonSequence.length];
    const viewport = renderer.viewport;
    const dpr = viewport.devicePixelRatio || renderer.getDevicePixelRatio();
    const width = viewport.width * dpr;
    const height = viewport.height * dpr;

    return [(offset[0] * 2.0 - 1.0) / width, (offset[1] * 2.0 - 1.0) / height];
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

  updateFrame() {
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
