define(function(require) {

    var Easing = require('./easing');

    var Controller = function(options) {

        this._targetPool = options.target || {};
        if (this._targetPool.constructor != Array) {
            this._targetPool = [this._targetPool];
        }

        this._life = options.life || 1000;

        this._delay = options.delay || 0;
        
        this._startTime = new Date().getTime() + this._delay;

        this._endTime = this._startTime + this._life*1000;

        this.loop = typeof(options.loop) == 'undefined'
                    ? false : options.loop;

        if (this.loop) {
            if (typeof(this.loop) == 'number') {
                this._currentLoop = this.loop;
            } else {
                this._currentLoop = 9999999;
            }
        }

        this.gap = options.gap || 0;

        this.easing = options.easing || 'Linear';

        this.onframe = options.onframe || null;

        this.ondestroy = options.ondestroy || null;

        this.onrestart = options.onrestart || null;
    };

    Controller.prototype = {
        step : function(time) {
            var percent = (time - this._startTime) / this._life;

            if (percent < 0) {
                return;
            }

            percent = Math.min(percent, 1);

            var easingFunc = typeof(this.easing) == 'string'
                             ? Easing[this.easing]
                             : this.easing;
            var schedule;
            if (typeof easingFunc === 'function') {
                schedule = easingFunc(percent);
            }else{
                schedule = percent;
            }
            this.fire('frame', schedule);

            if (percent == 1) {
                if (this.loop && this._currentLoop) {
                    this.restart();
                    this._currentLoop--;
                    return 'restart';
                }else{
                    // Mark this controller to be deleted
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
            for(var i = 0, len = this._targetPool.length; i < len; i++) {
                if (this['on' + eventType]) {
                    this['on' + eventType](this._targetPool[i], arg);
                }
            }
        }
    };
    Controller.prototype.constructor = Controller;

    return Controller;
});