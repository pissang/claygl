import ProceduralKeyframeAnimator from './animation/ProceduralKeyframeAnimator';
import { Animator } from './animation/Animator';
import Notifier from './core/notifier';
import Clip from './animation/Clip';

interface Stage {
  render?: () => void;
}

/**
 * Animation is global timeline that schedule all clips. each frame animation will set the time of clips to current and update the states of clips
 *
 * @example
 * const animation = new clay.Timeline();
 * const node = new clay.Node();
 * animation.animate(node.position)
 *     .when(1000, {
 *         x: 500,
 *         y: 500
 *     })
 *     .when(2000, {
 *         x: 100,
 *         y: 100
 *     })
 *     .when(3000, {
 *         z: 10
 *     })
 *     .start('spline');
 */

export function getTime() {
  return new Date().getTime();
}

interface TimelineOption {
  stage?: Stage;
}

export default class Timeline extends Notifier {
  stage: Stage;

  // Use linked list to store clip
  private _head?: Clip;
  private _tail?: Clip;

  private _running = false;

  private _time = 0;
  private _pausedTime = 0;
  private _pauseStart = 0;

  private _paused = false;

  constructor(opts?: TimelineOption) {
    super();

    this.stage = (opts && opts.stage) || {};
  }

  /**
   * Add clip
   */
  addClip(clip: Clip) {
    if (clip.timeline) {
      // Clip has been added
      this.removeClip(clip);
    }

    if (!this._head) {
      this._head = this._tail = clip;
    } else {
      this._tail!.next = clip;
      clip.prev = this._tail;
      clip.next = undefined;
      this._tail = clip;
    }
    clip.timeline = this;
  }
  /**
   * Add animator
   */
  addAnimator(animator: Animator) {
    animator.timeline = this;
    const clip = animator.getClip();
    if (clip) {
      this.addClip(clip);
    }
  }
  /**
   * Delete animation clip
   */
  removeClip(clip: Clip) {
    if (!clip.timeline) {
      return;
    }
    const prev = clip.prev;
    const next = clip.next;
    if (prev) {
      prev.next = next;
    } else {
      // Is head
      this._head = next;
    }
    if (next) {
      next.prev = prev;
    } else {
      // Is tail
      this._tail = prev;
    }
    clip.next = clip.prev = clip.timeline = undefined;
  }

  /**
   * Delete animation clip
   */
  removeAnimator(animator: Animator) {
    const clip = animator.getClip();
    if (clip) {
      this.removeClip(clip);
    }
    animator.timeline = undefined;
  }

  update(notTriggerFrameAndStageUpdate?: boolean) {
    const time = getTime() - this._pausedTime;
    const delta = time - this._time;
    let clip = this._head;

    while (clip) {
      // Save the nextClip before step.
      // So the loop will not been affected if the clip is removed in the callback
      const nextClip = clip.next;
      const finished = clip.step(time, delta);
      if (finished) {
        clip.ondestroy && clip.ondestroy();
        this.removeClip(clip);
        clip = nextClip;
      } else {
        clip = nextClip;
      }
    }

    this._time = time;

    if (!notTriggerFrameAndStageUpdate) {
      // 'frame' should be triggered before stage, because upper application
      // depends on the sequence (e.g., echarts-stream and finish
      // event judge)
      this.trigger('frame', delta);

      this.stage.render && this.stage.render();
    }
  }

  _startLoop() {
    const self = this;

    this._running = true;

    function step() {
      if (self._running) {
        requestAnimationFrame(step);
        !self._paused && self.update();
      }
    }

    requestAnimationFrame(step);
  }

  /**
   * Start animation.
   */
  start() {
    if (this._running) {
      return;
    }

    this._time = getTime();
    this._pausedTime = 0;

    this._startLoop();
  }

  /**
   * Stop animation.
   */
  stop() {
    this._running = false;
  }

  /**
   * Pause animation.
   */
  pause() {
    if (!this._paused) {
      this._pauseStart = getTime();
      this._paused = true;
    }
  }

  /**
   * Resume animation.
   */
  resume() {
    if (this._paused) {
      this._pausedTime += getTime() - this._pauseStart;
      this._paused = false;
    }
  }

  /**
   * Clear animation.
   */
  clear() {
    let clip = this._head;

    while (clip) {
      const nextClip = clip.next;
      clip.prev = clip.next = clip.timeline = undefined;
      clip = nextClip;
    }

    this._head = this._tail = undefined;
  }

  /**
   * Whether animation finished.
   */
  isFinished() {
    return this._head == null;
  }

  /**
   * Creat animator for a target, whose props can be animated.
   */
  // TODO Gap
  animate<T>(
    target: T,
    options?: {
      loop?: boolean; // Whether loop animation
    }
  ) {
    options = options || {};

    // Start animation loop
    this.start();

    const animator = new ProceduralKeyframeAnimator(target, options.loop, true);

    this.addAnimator(animator);

    return animator;
  }
}
