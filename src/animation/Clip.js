define(function (require) {

    'use strict';

    var Easing = require('./easing');

    function noop () {}
    /**
     * @constructor
     * @alias qtek.animation.Clip
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
                if (typeof(loop) == 'number') {
                    this._loopRemained = loop;
                }
                else {
                    this._loopRemained = 1e8;
                }
            }
        },

        /**
         * @param {string|function} easing
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
        step: function (time) {
            if (!this._initialized) {
                this._currentTime = time;
                this._startTime = this._currentTime + this.delay;
                this._initialized = true;
            }

            if (time < this._startTime) {
                this._currentTime = time;
                return;
            }

            this._elapse(time);

            var percent = this._elapsedTime / this.life;

            if (percent < 0) {
                return;
            }
            if (percent > 1) {
                percent = 1;
            }

            var schedule;
            if (this.easing) {
                schedule = this.easing(percent);
            }
            else {
                schedule = percent;
            }
            this.fire('frame', schedule);

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

            time = time;
            // Remainder ignored if restart is invoked manually
            if (time) {
                this._elapse(time);
                remainder = this._elapsedTime % this.life;
            }
            time = time || new Date().getTime();

            this._startTime = time - remainder + this.delay;
            this._elapsedTime = 0;
            this._currentTime = time - remainder;

            this._needsRemove = false;
        },

        _restartInLoop: function (time) {
            this._startTime = time + this.gap;
            this._currentTime = time;
            this._elapsedTime = 0;
        },

        _elapse: function (time) {
            this._elapsedTime += (time - this._currentTime) * this.playbackRate;
            this._currentTime = time;
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
        }
    };
    Clip.prototype.constructor = Clip;

    return Clip;
});