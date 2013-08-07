define(function(require) {
    
    var Controller = require('./controller');
    var _ = require("_");

    var requrestAnimationFrame = window.requrestAnimationFrame
                                || window.mozRequestAnimationFrame
                                || window.webkitRequestAnimationFrame;

    var Animation = function(options) {

        options = options || {};

        this.stage = options.stage || {};

        this.onframe = options.onframe || function() {};

        // private properties
        this._controllerPool = [];

        this._running = false;
    };

    Animation.prototype = {
        add : function(controller) {
            this._controllerPool.push(controller);
        },
        remove : function(controller) {
            var idx = this._controllerPool.indexOf(controller);
            if (idx >= 0) {
                this._controllerPool.splice(idx, 1);
            }
        },
        update : function() {
            var time = new Date().getTime();
            var cp = this._controllerPool;
            var len = cp.length;

            var deferredEvents = [];
            var deferredCtls = [];
            for (var i = 0; i < len; i++) {
                var controller = cp[i];
                var e = controller.step(time);
                // Throw out the events need to be called after
                // stage.update, like destroy
                if ( e ) {
                    deferredEvents.push(e);
                    deferredCtls.push(controller);
                }
            }
            if (this.stage
                && this.stage.render
                && this._controllerPool.length
            ) {
                this.stage.render();
            }

            // Remove the finished controller
            var newArray = [];
            for (var i = 0; i < len; i++) {
                if (!cp[i]._needsRemove) {
                    newArray.push(cp[i]);
                    cp[i]._needsRemove = false;
                }
            }
            this._controllerPool = newArray;

            len = deferredEvents.length;
            for (var i = 0; i < len; i++) {
                deferredCtls[i].fire( deferredEvents[i] );
            }

            this.onframe();

        },
        start : function() {
            var self = this;

            this._running = true;

            function step() {
                if (self._running) {
                    self.update();
                    requrestAnimationFrame(step);
                }
            }

            requrestAnimationFrame(step);
        },
        stop : function() {
            this._running = false;
        },
        clear : function() {
            this._controllerPool = [];
        },
        animate : function(options) {
            var deferred = new Deferred(options.target, 
                                        options.loop, 
                                        options.getter, 
                                        options.setter, 
                                        options.interpolate);
            deferred.animation = this;
            return deferred;
        }
    };
    Animation.prototype.constructor = Animation;

    function _defaultGetter(target, key) {
        return target[key];
    }
    function _defaultSetter(target, key, value) {
        target[key] = value;
    }

    function _defaultInterpolate(prevValue, nextValue, percent) {
        return (nextValue-prevValue) * percent + prevValue;
    }
    function Deferred(target, loop, getter, setter, interpolate) {
        this._tracks = {};
        this._target = target;

        this._loop = loop || false;

        this._getter = getter || _defaultGetter;
        this._setter = setter || _defaultSetter;
        this._interpolate = interpolate || _defaultInterpolate;

        this._controllerCount = 0;

        this._delay = 0;

        this._doneList = [];

        this._onframeList = [];

        this._controllerList = [];
    }

    Deferred.prototype = {
        when : function(time /* ms */, props, easing) {
            for (var propName in props) {
                if (! this._tracks[propName]) {
                    this._tracks[propName] = [];
                    // Initialize value
                    this._tracks[propName].push({
                        time : 0,
                        value : this._getter(this._target, propName)
                    });
                }
                this._tracks[propName].push({
                    time : time,
                    value : props[propName],
                    easing : easing
                });
            }
            return this;
        },
        during : function(callback) {
            this._onframeList.push(callback);
            return this;
        },
        start : function() {
            var self = this;
            var delay;
            var track;
            var trackMaxTime;
            var value;
            var setter = this._setter;

            function createOnframe(now, next, propName) {
                var prevValue = now.value;
                var nextValue = next.value;
                return function(target, schedule) {
                    value = self._interpolate(prevValue, nextValue, schedule);
                    setter(target, propName, value);
                    for (var i = 0; i < self._onframeList.length; i++) {
                        self._onframeList[i](target, schedule);
                    }
                };
            }

            function ondestroy() {
                self._controllerCount--;
                if (self._controllerCount === 0) {
                    var len = self._doneList.length;
                    for (var i = 0; i < len; i++) {
                        self._doneList[i].call(self);
                    }
                }
            }

            for (var propName in this._tracks) {
                delay = this._delay;
                track = this._tracks[propName];
                if (track.length) {
                    trackMaxTime = track[track.length-1].time;
                }else{
                    continue;
                }
                for (var i = 0; i < track.length-1; i++) {
                    var now = track[i],
                        next = track[i+1];

                    var controller = new Controller({
                        target : self._target,
                        life : next.time - now.time,
                        delay : delay,
                        loop : self._loop,
                        gap : trackMaxTime - (next.time - now.time),
                        easing : next.easing,
                        onframe : createOnframe(now, next, propName),
                        ondestroy : ondestroy
                    });
                    this._controllerList.push(controller);

                    this._controllerCount++;
                    delay = next.time + this._delay;

                    self.animation.add(controller);
                }
            }
            return this;
        },
        stop : function() {
            for (var i = 0; i < this._controllerList.length; i++) {
                var controller = this._controllerList[i];
                this.animation.remove(controller);
            }
        },
        delay : function(time){
            this._delay = time;
            return this;
        },
        done : function(func) {
            this._doneList.push(func);
            return this;
        }
    };

    return Animation;
});
