define(function(require) {

    var Easing = require('./easing');

    var Clip = function(options) {

        options = options || {};

        this.target = options.target;

        if (options.life !== undefined) {
            this.life = options.life;
        }
        if (options.delay !== undefined) {
            this.delay = options.delay;
        }
        if (options.gap !== undefined) {
            this.gap = options.gap;
        }
        
        this._startTime = new Date().getTime() + this.delay;

        this._endTime = this._startTime + this.life;

        this._loop = options.loop === undefined ? false : options.loop;
        this.setLoop(this._loop);

        if (options.easing !== undefined) {
            this.setEasing(options.easing);
        }

        if (options.onframe !== undefined) {
            this.onframe = options.onframe;
        }

        if (options.ondestroy !== undefined) {
            this.ondestroy = options.ondestroy;
        }

        if (options.onrestart !== undefined) {
            this.onrestart = options.onrestart;
        }

    };

    Clip.prototype = {

        gap : 0,

        life : 0,

        delay : 0,

        gap : 0,

        setLoop : function(loop) {
            this._loop = loop;
            if (loop) {
                if (typeof(loop) == 'number') {
                    this._loopRemained = loop;
                } else {
                    this._loopRemained = Number.MAX_VALUE;
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
            var percent = (time - this._startTime) / this.life;

            if (percent < 0) {
                return;
            }

            percent = Math.min(percent, 1);

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
                }else{
                    // Mark this clip to be deleted
                    // In the animation.update
                    this._needsRemove = true;

                    return 'destroy';
                }
            }else{
                return null;
            }
        },

        restart : function() {
            this._startTime = new Date().getTime() + this.gap;
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