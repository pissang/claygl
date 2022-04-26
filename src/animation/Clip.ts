import { builtinEasing, EasingFunc, createCubicEasingFunc } from './easing';

function noop() {}

type Easing = keyof typeof builtinEasing | EasingFunc;

type OnframeCallback = (percent: number) => void;
type ondestroyCallback = () => void;
type onrestartCallback = () => void;

export interface ClipProps {
  life?: number;
  delay?: number;
  loop?: boolean;
  easing?: Easing;

  playbackRatio?: number;

  onframe?: OnframeCallback;
  ondestroy?: ondestroyCallback;
  onrestart?: onrestartCallback;
}

export default class Clip {
  private _life: number;
  private _delay: number;

  private _inited: boolean = false;
  private _startTime = 0; // 开始时间单位毫秒

  private _pausedTime = 0;
  private _paused = false;

  loop: boolean;
  playbackRatio: number = 1;

  easingFunc?: (p: number) => number;

  onframe: OnframeCallback;
  ondestroy: ondestroyCallback;
  onrestart: onrestartCallback;

  constructor(opts: ClipProps) {
    this._life = opts.life || 1000;
    this._delay = opts.delay || 0;

    this.loop = opts.loop || false;

    this.onframe = opts.onframe || noop;
    this.ondestroy = opts.ondestroy || noop;
    this.onrestart = opts.onrestart || noop;

    this.playbackRatio = opts.playbackRatio || 1;

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
    const elapsedTime = (globalTime - this._startTime - this._pausedTime) * this.playbackRatio;
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

    this.onframe(schedule);

    if (percent === 1) {
      if (this.loop) {
        // Restart
        const remainder = elapsedTime % life;
        this._startTime = globalTime - remainder;
        this._pausedTime = 0;

        this.onrestart();
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

  setEasing(easing: Easing) {
    this.easingFunc =
      typeof easing === 'function'
        ? easing
        : builtinEasing[easing] || createCubicEasingFunc(easing);
  }
}
