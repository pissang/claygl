define(function(require) {
    
    var Clip = require('./clip');
    var _ = require("_");

    var requrestAnimationFrame = window.requrestAnimationFrame
                                || window.mozRequestAnimationFrame
                                || window.webkitRequestAnimationFrame;

    var Animation = function(options) {

        options = options || {};

        this.stage = options.stage || {};

        this.onframe = options.onframe || function() {};

        // private properties
        this._clips = [];

        this._running = false;
    };

    Animation.prototype = {
        add : function(clip) {
            this._clips.push(clip);
        },
        remove : function(clip) {
            var idx = this._clips.indexOf(clip);
            if (idx >= 0) {
                this._clips.splice(idx, 1);
            }
        },
        update : function() {
            var time = new Date().getTime();
            var cp = this._clips;
            var len = cp.length;

            var deferredEvents = [];
            var deferredClips = [];
            for (var i = 0; i < len; i++) {
                var clip = cp[i];
                var e = clip.step(time);
                // Throw out the events need to be called after
                // stage.update, like destroy
                if (e) {
                    deferredEvents.push(e);
                    deferredClips.push(clip);
                }
            }
            if (this.stage
                && this.stage.render
                && this._clips.length
            ) {
                this.stage.render();
            }

            // Remove the finished clip
            var newArray = [];
            for (var i = 0; i < len; i++) {
                if (!cp[i]._needsRemove) {
                    newArray.push(cp[i]);
                    cp[i]._needsRemove = false;
                }
            }
            this._clips = newArray;

            len = deferredEvents.length;
            for (var i = 0; i < len; i++) {
                deferredClips[i].fire( deferredEvents[i] );
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
            this._clips = [];
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

        this._clipCount = 0;

        this._delay = 0;

        this._doneList = [];

        this._onframeList = [];

        this._clipList = [];
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
                self._clipCount--;
                if (self._clipCount === 0) {
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

                    var clip = new Clip({
                        target : self._target,
                        life : next.time - now.time,
                        delay : delay,
                        loop : self._loop,
                        gap : trackMaxTime - (next.time - now.time),
                        easing : next.easing,
                        onframe : createOnframe(now, next, propName),
                        ondestroy : ondestroy
                    });
                    this._clipList.push(clip);

                    this._clipCount++;
                    delay = next.time + this._delay;

                    self.animation.add(clip);
                }
            }
            return this;
        },
        stop : function() {
            for (var i = 0; i < this._clipList.length; i++) {
                var clip = this._clipList[i];
                this.animation.remove(clip);
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
