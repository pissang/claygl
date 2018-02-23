import Easing from './easing';

function noop () {}
/**
 * @constructor
 * @alias clay.animation.Clip
 * @param {Object} [opts]
 * @param {Object} [opts.target]
 * @param {number} [opts.life]
 * @param {number} [opts.delay]
 * @param {number} [opts.gap]
 * @param {number} [opts.playbackRate]
 * @param {boolean|number} [opts.loop] If loop is a number, it indicate the loop count of animation
 * @param {string|Function} [opts.easing]
 * @param {Function} [opts.onframe]
 * @param {Function} [opts.onfinish]
 * @param {Function} [opts.onrestart]
 */
var Clip = function (opts) {

    opts = opts || {};

    /**
     * @type {string}
     */
    this.name = opts.name || '';

    /**
     * @type {Object}
     */
    this.target = opts.target;

    /**
     * @type {number}
     */
    this.life = opts.life || 1000;

    /**
     * @type {number}
     */
    this.delay = opts.delay || 0;

    /**
     * @type {number}
     */
    this.gap = opts.gap || 0;

    /**
     * @type {number}
     */
    this.playbackRate = opts.playbackRate || 1;


    this._initialized = false;

    this._elapsedTime = 0;

    this._loop = opts.loop == null ? false : opts.loop;
    this.setLoop(this._loop);

    if (opts.easing != null) {
        this.setEasing(opts.easing);
    }

    /**
     * @type {Function}
     */
    this.onframe = opts.onframe || noop;

    /**
     * @type {Function}
     */
    this.onfinish = opts.onfinish || noop;

    /**
     * @type {Function}
     */
    this.onrestart = opts.onrestart || noop;

    this._paused = false;
};

Clip.prototype = {

    gap: 0,

    life: 0,

    delay: 0,

    /**
     * @param {number|boolean} loop
     */
    setLoop: function (loop) {
        this._loop = loop;
        if (loop) {
            if (typeof loop === 'number') {
                this._loopRemained = loop;
            }
            else {
                this._loopRemained = Infinity;
            }
        }
    },

    /**
     * @param {string|Function} easing
     */
    setEasing: function (easing) {
        if (typeof(easing) === 'string') {
            easing = Easing[easing];
        }
        this.easing = easing;
    },

    /**
     * @param  {number} time
     * @return {string}
     */
    step: function (time, deltaTime, silent) {
        if (!this._initialized) {
            this._startTime = time + this.delay;
            this._initialized = true;
        }
        if (this._currentTime != null) {
            deltaTime = time - this._currentTime;
        }
        this._currentTime = time;

        if (this._paused) {
            return 'paused';
        }

        if (time < this._startTime) {
            return;
        }

        // PENDIGN Sync ?
        this._elapse(time, deltaTime);

        var percent = Math.min(this._elapsedTime / this.life, 1);

        if (percent < 0) {
            return;
        }

        var schedule;
        if (this.easing) {
            schedule = this.easing(percent);
        }
        else {
            schedule = percent;
        }

        if (!silent) {
            this.fire('frame', schedule);
        }

        if (percent === 1) {
            if (this._loop && this._loopRemained > 0) {
                this._restartInLoop(time);
                this._loopRemained--;
                return 'restart';
            }
            else {
                // Mark this clip to be deleted
                // In the animation.update
                this._needsRemove = true;

                return 'finish';
            }
        }
        else {
            return null;
        }
    },

    /**
     * @param  {number} time
     * @return {string}
     */
    setTime: function (time) {
        return this.step(time + this._startTime);
    },

    restart: function (time) {
        // If user leave the page for a while, when he gets back
        // All clips may be expired and all start from the beginning value(position)
        // It is clearly wrong, so we use remainder to add a offset

        var remainder = 0;
        // Remainder ignored if restart is invoked manually
        if (time) {
            this._elapse(time);
            remainder = this._elapsedTime % this.life;
        }
        time = time || Date.now();

        this._startTime = time - remainder + this.delay;
        this._elapsedTime = 0;

        this._needsRemove = false;
        this._paused = false;
    },

    getElapsedTime: function () {
        return this._elapsedTime;
    },

    _restartInLoop: function (time) {
        this._startTime = time + this.gap;
        this._elapsedTime = 0;
    },

    _elapse: function (time, deltaTime) {
        this._elapsedTime += deltaTime * this.playbackRate;
    },

    fire: function (eventType, arg) {
        var eventName = 'on' + eventType;
        if (this[eventName]) {
            this[eventName](this.target, arg);
        }
    },

    clone: function () {
        var clip = new this.constructor();
        clip.name = this.name;
        clip._loop = this._loop;
        clip._loopRemained = this._loopRemained;

        clip.life = this.life;
        clip.gap = this.gap;
        clip.delay = this.delay;

        return clip;
    },
    /**
     * Pause the clip.
     */
    pause: function () {
        this._paused = true;
    },

    /**
     * Resume the clip.
     */
    resume: function () {
        this._paused = false;
    }
};
Clip.prototype.constructor = Clip;

export default Clip;
