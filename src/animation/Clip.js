define(function(require) {

    var Easing = require('./easing');

    var Clip = function(options) {

        options = options || {};

        this.target = options.target;

        if( typeof(options.life) !== 'undefined') {
            this.life = options.life;
        }
        if (typeof(options.delay) !== 'undefined') {
            this.delay = options.delay;
        }
        if (typeof(options.gap) !== 'undefined') {
            this.gap = options.gap;
        }

        if (typeof(options.playbackRatio) !== 'undefined') {
            this.playbackRatio = options.playbackRatio;
        } else {
            this.playbackRatio = 1;
        }

        this._currentTime = new Date().getTime();
        
        this._startTime = this._currentTime + this.delay;

        this._elapsedTime = 0;

        this._loop = options.loop === undefined ? false : options.loop;
        this.setLoop(this._loop);

        if (typeof(options.easing) !== 'undefined') {
            this.setEasing(options.easing);
        }

        if (typeof(options.onframe) !== 'undefined') {
            this.onframe = options.onframe;
        }

        if (typeof(options.ondestroy) !== 'undefined') {
            this.ondestroy = options.ondestroy;
        }

        if (typeof(options.onrestart) !== 'undefined') {
            this.onrestart = options.onrestart;
        }

    };

    Clip.prototype = {

        gap : 0,

        life : 0,

        delay : 0,
        
        setLoop : function(loop) {
            this._loop = loop;
            if (loop) {
                if (typeof(loop) == 'number') {
                    this._loopRemained = loop;
                } else {
                    this._loopRemained = 1e8;
                }   
            }
        },

        setEasing : function(easing) {
            if (typeof(easing) === 'string') {
                easing = Easing[easing];
            }
            this.easing = easing;
        },

        step : function(time) {
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
            }else{
                schedule = percent;
            }
            this.fire('frame', schedule);

            if (percent == 1) {
                if (this._loop && this._loopRemained > 0) {
                    this.restart();
                    this._loopRemained--;
                    return 'restart';
                } else {
                    // Mark this clip to be deleted
                    // In the animation.update
                    this._needsRemove = true;

                    return 'destroy';
                }
            } else {
                return null;
            }
        },

        setTime : function(time) {
            return this.step(time + this._startTime);
        },

        restart : function() {
            // If user leave the page for a while, when he gets back
            // All clips may be expired and all start from the beginning value(position)
            // It is clearly wrong, so we use remainder to add a offset
            var time = new Date().getTime();
            this._elapse(time);

            var remainder = this._elapsedTime % this.life;
            this._startTime = time - remainder + this.gap;
            this._elapsedTime = 0;
        },

        _elapse: function(time) {
            this._elapsedTime += (time - this._currentTime) * this.playbackRatio;
            this._currentTime = time;
        },
        
        fire : function(eventType, arg) {
            var eventName = 'on' + eventType;
            if (this[eventName]) {
                this[eventName](this.target, arg);
            }
        }
    };
    Clip.prototype.constructor = Clip;

    return Clip;
});