// 1D Blend clip of blend tree

// TODO playbackRatio

import { BlendAnimator, BlendAnimatorOpts, BlendAnimatorTarget } from './BlendAnimator';
import Clip from './Clip';

const clipSortFunc = function (a: { position: number }, b: { position: number }) {
  return a.position - b.position;
};

interface Blend1DAnimatorInput {
  position: number;
  offset: number;
  animator: BlendAnimatorTarget;
}
interface Blend1DAnimatorOpts extends BlendAnimatorOpts {
  output: BlendAnimatorTarget;
  inputs: Blend1DAnimatorInput[];
  playbackRatio?: number;
}
/**
 * 1d blending node in animation blend tree.
 * output clip must have blend1D and copy method
 */
class Blend1DAnimator extends BlendAnimator {
  position: number = 0;

  private _cacheKey: number = 0;
  private _cachePosition: number = -Infinity;

  private _loop?: boolean;

  private _elpasedTime?: number;

  protected _output?: BlendAnimatorTarget;
  protected _inputs: Blend1DAnimatorInput[];

  constructor(opts?: Partial<Blend1DAnimatorOpts>) {
    opts = opts || {};
    super(opts);

    this._inputs = (opts.inputs || []).sort(clipSortFunc);
    this._output = opts.output;
  }

  addInput(position: number, inputAnimator: BlendAnimatorTarget, offset: number) {
    const obj: Blend1DAnimatorInput = {
      position: position,
      animator: inputAnimator,
      offset: offset || 0
    };

    this._inputs.push(obj);
    this._inputs.sort(clipSortFunc);

    return obj;
  }

  setTime(time: number) {
    const position = this.position;
    const inputs = this._inputs;
    const len = inputs.length;
    const min = inputs[0].position;
    const max = inputs[len - 1].position;

    if (position <= min || position >= max) {
      const in0 = position <= min ? inputs[0] : inputs[len - 1];
      const inAnim = in0.animator;
      const offset = in0.offset;
      inAnim.setTime((time + offset) % inAnim.getLife());
      if (this._output) {
        // Input clip is a blend clip
        // TODO
        // if (clip.output) {
        //   this.output.copy(clip.output);
        // } else {
        this._output.copy(inAnim);
        // }
      }
    } else {
      const key = this._findKey(position);
      const in1 = inputs[key];
      const in2 = inputs[key + 1];
      const ani1 = in1.animator;
      const ani2 = in2.animator;
      // Set time on input clips
      ani1.setTime((time + in1.offset) % ani1.getLife());
      ani2.setTime((time + in2.offset) % ani1.getLife());

      const w = (this.position - in1.position) / (in2.position - in1.position);

      // TODO
      // const c1 = clip1.output ? clip1.output : clip1;
      // const c2 = clip2.output ? clip2.output : clip2;
      if (this._output) {
        this._output.blend1D(ani1, ani2, w);
      }
    }
  }

  /**
   * Clone a new Blend1D clip
   * @param {boolean} cloneInputs True if clone the input clips
   * @return {clay.animation.Blend1DAnimator}
   */
  // clone(cloneInputs?: boolean) {
  //   clip.output = this.output.clone();
  //   for (let i = 0; i < this.inputs.length; i++) {
  //     const inputClip = cloneInputs ? this.inputs[i].clip.clone(true) : this.inputs[i].clip;
  //     clip.addInput(this.inputs[i].position, inputClip, this.inputs[i].offset);
  //   }
  //   return clip;
  // }

  // Find the key where position in range [inputs[key].position, inputs[key+1].position)
  _findKey(position: number) {
    let key = -1;
    const inputs = this._inputs;
    const len = inputs.length;
    if (this._cachePosition < position) {
      for (let i = this._cacheKey; i < len - 1; i++) {
        if (position >= inputs[i].position && position < inputs[i + 1].position) {
          key = i;
        }
      }
    } else {
      const s = Math.min(len - 2, this._cacheKey);
      for (let i = s; i >= 0; i--) {
        if (position >= inputs[i].position && position < inputs[i + 1].position) {
          key = i;
        }
      }
    }
    if (key >= 0) {
      this._cacheKey = key;
      this._cachePosition = position;
    }

    return key;
  }
}

export default Blend1DAnimator;
