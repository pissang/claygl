import { Animator } from './Animator';
import Clip from './Clip';

export interface BlendAnimatorOpts {
  loop?: boolean;
}
interface BlendAnimator extends Animator {}
abstract class BlendAnimator {
  abstract setTime(number: number): void;

  protected _inputs: {
    animator: BlendAnimatorTarget;
  }[] = [];
  protected _output?: BlendAnimatorTarget;

  private _clip?: Clip;
  private _loop?: boolean;

  constructor(opts?: Partial<BlendAnimatorOpts>) {
    opts = opts || {};
    this._loop = opts.loop;
  }

  start(): void {
    // Stop previous
    this.stop();

    let life = 0;

    this._inputs.forEach((input) => {
      life = Math.max(input.animator.getLife(), life);
    });

    this._clip = new Clip({
      life,
      loop: this._loop,
      onframe: (percent, elapsedTime) => {
        this.setTime(elapsedTime);
      }
    });

    if (this.timeline) {
      this.timeline.addClip(this._clip);
    }
  }

  getClip(): Clip | undefined {
    return this._clip;
  }

  getLife(): number {
    return (this._clip && this._clip.getLife()) || 0;
  }
  getLoop(): boolean {
    return this._loop || false;
  }

  stop() {
    if (this._clip && this.timeline) {
      this.timeline.removeClip(this._clip);
    }
  }
}

export { BlendAnimator };

export interface BlendAnimatorTarget extends Animator {
  copy(animator: Animator): void;
  setTime(number: number): void;
  blend1D(animator1: BlendAnimatorTarget, animator2: BlendAnimatorTarget, w: number): void;
  blend2D(
    animator1: BlendAnimatorTarget,
    animator2: BlendAnimatorTarget,
    animator3: BlendAnimatorTarget,
    f: number,
    g: number
  ): void;
  getLife(): number;
}
