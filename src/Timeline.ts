// @ts-nocheck
import Base from './core/Base';
import vendor from './core/vendor';
import Animator from './animation/Animator';

/**
 * Animation is global timeline that schedule all clips. each frame animation will set the time of clips to current and update the states of clips
 * @constructor clay.Timeline
 * @extends clay.core.Base
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
const Timeline = Base.extend(
  function () {
    return /** @lends clay.Timeline# */ {
      /**
       * stage is an object with render method, each frame if there exists any animating clips, stage.render will be called
       * @type {Object}
       */
      stage: null,

      _clips: [],

      _running: false,

      _time: 0,

      _paused: false,

      _pausedTime: 0
    };
  },
  /** @lends clay.Timeline.prototype */
  {
    /**
     * Add animator
     * @param {clay.animate.Animator} animator
     */
    addAnimator: function (animator) {
      animator.animation = this;
      const clips = animator.getClips();
      for (let i = 0; i < clips.length; i++) {
        this.addClip(clips[i]);
      }
    },

    /**
     * @param {clay.animation.Clip} clip
     */
    addClip: function (clip) {
      if (this._clips.indexOf(clip) < 0) {
        this._clips.push(clip);
      }
    },

    /**
     * @param  {clay.animation.Clip} clip
     */
    removeClip: function (clip) {
      const idx = this._clips.indexOf(clip);
      if (idx >= 0) {
        this._clips.splice(idx, 1);
      }
    },

    /**
     * Remove animator
     * @param {clay.animate.Animator} animator
     */
    removeAnimator: function (animator) {
      const clips = animator.getClips();
      for (let i = 0; i < clips.length; i++) {
        this.removeClip(clips[i]);
      }
      animator.animation = null;
    },

    _update: function () {
      const time = Date.now() - this._pausedTime;
      const delta = time - this._time;
      const clips = this._clips;
      let len = clips.length;

      const deferredEvents = [];
      const deferredClips = [];
      for (let i = 0; i < len; i++) {
        const clip = clips[i];
        const e = clip.step(time, delta, false);
        // Throw out the events need to be called after
        // stage.render, like finish
        if (e) {
          deferredEvents.push(e);
          deferredClips.push(clip);
        }
      }

      // Remove the finished clip
      for (let i = 0; i < len; ) {
        if (clips[i]._needsRemove) {
          clips[i] = clips[len - 1];
          clips.pop();
          len--;
        } else {
          i++;
        }
      }

      len = deferredEvents.length;
      for (let i = 0; i < len; i++) {
        deferredClips[i].fire(deferredEvents[i]);
      }

      this._time = time;

      this.trigger('frame', delta);

      if (this.stage && this.stage.render) {
        this.stage.render();
      }
    },
    /**
     * Start running animation
     */
    start: function () {
      const self = this;

      this._running = true;
      this._time = Date.now();

      this._pausedTime = 0;

      const requestAnimationFrame = vendor.requestAnimationFrame;

      function step() {
        if (self._running) {
          requestAnimationFrame(step);

          if (!self._paused) {
            self._update();
          }
        }
      }

      requestAnimationFrame(step);
    },
    /**
     * Stop running animation
     */
    stop: function () {
      this._running = false;
    },

    /**
     * Pause
     */
    pause: function () {
      if (!this._paused) {
        this._pauseStart = Date.now();
        this._paused = true;
      }
    },

    /**
     * Resume
     */
    resume: function () {
      if (this._paused) {
        this._pausedTime += Date.now() - this._pauseStart;
        this._paused = false;
      }
    },

    /**
     * Remove all clips
     */
    removeClipsAll: function () {
      this._clips = [];
    },
    /**
     * Create an animator
     * @param  {Object} target
     * @param  {Object} [options]
     * @param  {boolean} [options.loop]
     * @param  {Function} [options.getter]
     * @param  {Function} [options.setter]
     * @param  {Function} [options.interpolater]
     * @return {clay.animation.Animator}
     */
    animate: function (target, options) {
      options = options || {};
      const animator = new Animator(
        target,
        options.loop,
        options.getter,
        options.setter,
        options.interpolater
      );
      animator.animation = this;
      return animator;
    }
  }
);

export default Timeline;
