define(function(require) {

    var Easing = require('./easing');

    var Clip = function(options) {

        this._targetPool = options.target || {};
        if (this._targetPool.constructor != Array) {
            this._targetPool = [this._targetPool];
        }

        this._life = options.life || 1000;

        this._delay = options.delay || 0;
        
        this._startTime = new Date().getTime() + this._delay;

        this._endTime = this._startTime + this._life*1000;
        this._needsRemove = false;

        this._loop = options.loop === undefined ? false : options.loop;
        this.setLoop(this._loop);

        this.gap = options.gap || 0;

        this.easing = options.easing;
        if (typeof(this.easing) === 'string') {
            this.easing = Easing[this.easing];
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

        step : function(time) {
            var percent = (time - this._startTime) / this._life;

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
            for(var i = 0, len = this._targetPool.length; i < len; i++) {
                if (this[eventName]) {
                    this[eventName](this._targetPool[i], arg);
                }
            }
        }
    };
    Clip.prototype.constructor = Clip;

    return Clip;
});