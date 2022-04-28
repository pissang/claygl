import { builtinEasing, EasingFunc, createCubicEasingFunc, AnimationEasing } from './easing';
import type Timeline from '../Timeline';

function noop() {}

type OnframeCallback = (percent: number, elapsedTime: number) => void;
type OndestroyCallback = () => void;
type OnrestartCallback = () => void;

export interface ClipOpts {
  life: number;
  delay: number;
  loop: boolean;
  easing: AnimationEasing;

  playbackRatio: number;

  onframe: OnframeCallback;
  ondestroy: OndestroyCallback;
  onrestart: OnrestartCallback;
}

export default class Clip {
  private _life: number;
  private _delay: number;

  private _inited: boolean = false;
  private _startTime = 0;

  private _pausedTime = 0;
  protected _paused = false;

  timeline?: Timeline;
  // Properties used in linked list in Timeline module
  next?: Clip;
  prev?: Clip;

  _loop: boolean;

  easingFunc?: (p: number) => number;

  onframe?: OnframeCallback;
  ondestroy?: OndestroyCallback;
  onrestart?: OnrestartCallback;

  constructor(opts?: Partial<ClipOpts>) {
    opts = opts || {};
    this._life = opts.life || 1000;
    this._delay = opts.delay || 0;

    this._loop = opts.loop || false;

    this.onframe = opts.onframe || noop;
    this.ondestroy = opts.ondestroy || noop;
    this.onrestart = opts.onrestart || noop;

    opts.easing && this.setEasing(opts.easing);
  }

  step(globalTime: number, deltaTime: number): boolean {
    // Set startTime on first step, or _startTime may has milleseconds different between clips
    // PENDING
    if (!this._inited) {
      this._startTime = globalTime + this._delay;
      this._inited = true;
    }

    if (this._paused) {
      this._pausedTime += deltaTime;
      return false;
    }

    const life = this._life;
    const elapsedTime = globalTime - this._startTime - this._pausedTime;
    let percent = elapsedTime / life;

    // PENDING: Not begin yet. Still run the loop.
    // In the case callback needs to be invoked.
    // Or want to update to the begin state at next frame when `setToFinal` and `delay` are both used.
    // To avoid the unexpected blink.
    if (percent < 0) {
      percent = 0;
    }

    percent = Math.min(percent, 1);

    const easingFunc = this.easingFunc;
    const schedule = easingFunc ? easingFunc(percent) : percent;

    if (this.onframe) {
      this.onframe(schedule, elapsedTime);
    }

    if (percent === 1) {
      if (this._loop) {
        // Restart
        const remainder = elapsedTime % life;
        this._startTime = globalTime - remainder;
        this._pausedTime = 0;

        if (this.onrestart) {
          this.onrestart();
        }
      } else {
        return true;
      }
    }

    return false;
  }

  pause() {
    this._paused = true;
  }

  resume() {
    this._paused = false;
  }

  getLife() {
    return this._life;
  }

  setLife(life: number) {
    this._life = life;
  }

  setEasing(easing: AnimationEasing) {
    this.easingFunc =
      typeof easing === 'function'
        ? easing
        : builtinEasing[easing] || createCubicEasingFunc(easing);
  }
}
