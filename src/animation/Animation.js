define(function(require) {
    
    'use strict';

    var Clip = require('./Clip');
    var Base = require('../core/Base');

    var requestAnimationFrame = window.requestAnimationFrame
                                || window.msRequestAnimationFrame
                                || window.mozRequestAnimationFrame
                                || window.webkitRequestAnimationFrame
                                || function(func){setTimeout(func, 16);};

    var arraySlice = Array.prototype.slice;

    /** 
     * Animation is global timeline that schedule all clips. each frame animation will set the time of clips to current and update the states of clips
     * @constructor qtek.animation.Animation
     * @extends qtek.core.Base
     *
     * @example
     *     var animation = new qtek.animation.Animation();
     *     var node = new qtek.Node();
     *     animation.animate(node.position)
     *         .when(1000, {
     *             x: 500,
     *             y: 500
     *         })
     *         .when(2000, {
     *             x: 100,
     *             y: 100
     *         })
     *         .when(3000, {
     *             z: 10
     *         })
     *         .start('spline');
     */
    var Animation = Base.derive(function() {
        return /** @lends qtek.animation.Animation# */{
            /**
             * stage is an object with render method, each frame if there exists any animating clips, stage.render will be called
             * @type {Object}
             */
            stage: null,

            _clips: [],

            _running: false,
            
            _time: 0
        };
    },
    /** @lends qtek.animation.Animation.prototype */
    {
        /**
         * @param {qtek.animation.Clip} clip
         */
        addClip: function(clip) {
            this._clips.push(clip);
        },
        /**
         * @param  {qtek.animation.Clip} clip
         */
        removeClip: function(clip) {
            var idx = this._clips.indexOf(clip);
            this._clips.splice(idx, 1);
        },

        _update: function() {
            
            var time = new Date().getTime();
            var delta = time - this._time;
            var clips = this._clips;
            var len = clips.length;

            var deferredEvents = [];
            var deferredClips = [];
            for (var i = 0; i < len; i++) {
                var clip = clips[i];
                var e = clip.step(time);
                // Throw out the events need to be called after
                // stage.render, like destroy
                if (e) {
                    deferredEvents.push(e);
                    deferredClips.push(clip);
                }
            }

            // Remove the finished clip
            for (var i = 0; i < len;) {
                if (clips[i]._needsRemove) {
                    clips[i] = clips[len-1];
                    clips.pop();
                    len--;
                } else {
                    i++;
                }
            }

            len = deferredEvents.length;
            for (var i = 0; i < len; i++) {
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
        start: function() {
            var self = this;

            this._running = true;
            this._time = new Date().getTime();

            function step() {
                if (self._running) {
                    
                    requestAnimationFrame(step);

                    self._update();
                }
            }

            requestAnimationFrame(step);
        },
        /**
         * Stop running animation
         */
        stop: function() {
            this._running = false;
        },
        /**
         * Remove all clips
         */
        removeClipsAll: function() {
            this._clips = [];
        },
        /**
         * Create a deferred animating object
         * @param  {Object} target
         * @param  {Object} [options]
         * @param  {boolean} [options.loop]
         * @param  {Function} [options.getter]
         * @param  {Function} [options.setter]
         * @param  {Function} [options.interpolater]
         * @return {qtek.animation.Animation._Animator}
         */
        animate: function(target, options) {
            options = options || {};
            var deferred = new Animator(
                target,
                options.loop,
                options.getter,
                options.setter,
                options.interpolater
            );
            deferred.animation = this;
            return deferred;
        }
    });

    function _defaultGetter(target, key) {
        return target[key];
    }
    function _defaultSetter(target, key, value) {
        target[key] = value;
    }

    function _interpolateNumber(p0, p1, percent) {
        return (p1 - p0) * percent + p0;
    }

    function _interpolateArray(p0, p1, percent, out, arrDim) {
        var len = p0.length;
        if (arrDim == 1) {
            for (var i = 0; i < len; i++) {
                out[i] = _interpolateNumber(p0[i], p1[i], percent); 
            }
        } else {
            var len2 = p0[0].length;
            for (var i = 0; i < len; i++) {
                for (var j = 0; j < len2; j++) {
                    out[i][j] = _interpolateNumber(
                        p0[i][j], p1[i][j], percent
                    );
                }
            }
        }
    }

    function _isArrayLike(data) {
        if (typeof(data) == 'undefined') {
            return false;
        } else if (typeof(data) == 'string') {
            return false;
        } else {
            return typeof(data.length) == 'number';
        }
    }

    function _cloneValue(value) {
        if (_isArrayLike(value)) {
            var len = value.length;
            if (_isArrayLike(value[0])) {
                var ret = [];
                for (var i = 0; i < len; i++) {
                    ret.push(arraySlice.call(value[i]));
                }
                return ret;
            } else {
                return arraySlice.call(value);
            }
        } else {
            return value;
        }
    }

    function _catmullRomInterpolateArray(
        p0, p1, p2, p3, t, t2, t3, out, arrDim
    ) {
        var len = p0.length;
        if (arrDim == 1) {
            for (var i = 0; i < len; i++) {
                out[i] = _catmullRomInterpolate(
                    p0[i], p1[i], p2[i], p3[i], t, t2, t3
                );
            }
        } else {
            var len2 = p0[0].length;
            for (var i = 0; i < len; i++) {
                for (var j = 0; j < len2; j++) {
                    out[i][j] = _catmullRomInterpolate(
                        p0[i][j], p1[i][j], p2[i][j], p3[i][j],
                        t, t2, t3
                    );
                }
            }
        }
    }
    
    function _catmullRomInterpolate(p0, p1, p2, p3, t, t2, t3) {
        var v0 = (p2 - p0) * 0.5;
        var v1 = (p3 - p1) * 0.5;
        return (2 * (p1 - p2) + v0 + v1) * t3 
                + (- 3 * (p1 - p2) - 2 * v0 - v1) * t2
                + v0 * t + p1;
    }
    
    /**
     * @description Animator object can only be created by Animation.prototype.animate method.
     * After created, we can use {@link qtek.animation.Animation._Animator#when} to add all keyframes and {@link qtek.animation.Animation._Animator#start} it.
     * Clips will be automatically created and added to the animation instance which created this deferred object.
     * 
     * @constructor qtek.animation.Animation._Animator
     * 
     * @param {Object} target
     * @param {boolean} loop
     * @param {Function} getter
     * @param {Function} setter
     * @param {Function} interpolater
     */
    function Animator(target, loop, getter, setter, interpolater) {
        this._tracks = {};
        this._target = target;

        this._loop = loop || false;

        this._getter = getter || _defaultGetter;
        this._setter = setter || _defaultSetter;

        this._interpolater = interpolater || null;

        this._clipCount = 0;

        this._delay = 0;

        this._doneList = [];

        this._onframeList = [];

        this._clipList = [];
    }

    Animator.prototype = {

        constructor: Animator,

        /**
         * @param  {number} time Keyframe time using millisecond
         * @param  {Object} props A key-value object. Value can be number, 1d and 2d array
         * @return {qtek.animation.Animation._Animator}
         * @memberOf qtek.animation.Animation._Animator.prototype
         */
        when: function(time, props) {
            for (var propName in props) {
                if (! this._tracks[propName]) {
                    this._tracks[propName] = [];
                    // If time is 0 
                    //  Then props is given initialize value
                    // Else
                    //  Initialize value from current prop value
                    if (time !== 0) {
                        this._tracks[propName].push({
                            time: 0,
                            value: _cloneValue(
                                this._getter(this._target, propName)
                            )
                        });   
                    }
                }
                this._tracks[propName].push({
                    time: parseInt(time),
                    value: props[propName]
                });
            }
            return this;
        },
        /**
         * callback when running animation
         * @param  {Function} callback callback have two args, animating target and current percent
         * @return {qtek.animation.Animation._Animator}
         * @memberOf qtek.animation.Animation._Animator.prototype
         */
        during: function(callback) {
            this._onframeList.push(callback);
            return this;
        },
        /**
         * Start the animation
         * @param  {string|function} easing
         * @return {qtek.animation.Animation._Animator}
         * @memberOf qtek.animation.Animation._Animator.prototype
         */
        start: function(easing) {

            var self = this;
            var setter = this._setter;
            var getter = this._getter;
            var interpolater = this._interpolater;
            var onFrameListLen = self._onframeList.length;
            var useSpline = easing === 'spline';

            var ondestroy = function() {
                self._clipCount--;
                if (self._clipCount === 0) {
                    // Clear all tracks
                    self._tracks = {};

                    var len = self._doneList.length;
                    for (var i = 0; i < len; i++) {
                        self._doneList[i].call(self);
                    }
                }
            };

            var createTrackClip = function(keyframes, propName) {
                var trackLen = keyframes.length;
                if (!trackLen) {
                    return;
                }
                // Guess data type
                var firstVal = keyframes[0].value;
                var isValueArray = _isArrayLike(firstVal);

                // For vertices morphing
                var arrDim = (
                        isValueArray 
                        && _isArrayLike(firstVal[0])
                    )
                    ? 2 : 1;
                // Sort keyframe as ascending
                keyframes.sort(function(a, b) {
                    return a.time - b.time;
                });

                var trackMaxTime = keyframes[trackLen - 1].time;
                // Percents of each keyframe
                var kfPercents = [];
                // Value of each keyframe
                var kfValues = [];
                for (var i = 0; i < trackLen; i++) {
                    kfPercents.push(keyframes[i].time / trackMaxTime);
                    kfValues.push(keyframes[i].value);
                }

                // Cache the key of last frame to speed up when 
                // animation playback is sequency
                var cacheKey = 0;
                var cachePercent = 0;
                var start;
                var i, w;
                var p0, p1, p2, p3;

                var onframe = function(target, percent) {
                    // Find the range keyframes
                    // kf1-----kf2---------current--------kf3
                    // find kf2(i) and kf3(i+1) and do interpolation
                    if (percent < cachePercent) {
                        // Start from next key
                        start = Math.min(cacheKey + 1, trackLen - 1);
                        for (i = start; i >= 0; i--) {
                            if (kfPercents[i] <= percent) {
                                break;
                            }
                        }
                        i = Math.min(i, trackLen-2);
                    } else {
                        for (i = cacheKey; i < trackLen; i++) {
                            if (kfPercents[i] > percent) {
                                break;
                            }
                        }
                        i = Math.min(i-1, trackLen-2);
                    }
                    cacheKey = i;
                    cachePercent = percent;

                    var range = (kfPercents[i+1] - kfPercents[i]);
                    if (range === 0) {
                        return;
                    } else {
                        w = (percent - kfPercents[i]) / range;
                    }
                    if (useSpline) {
                        p1 = kfValues[i];
                        p0 = kfValues[i === 0 ? i : i - 1];
                        p2 = kfValues[i > trackLen - 2 ? trackLen - 1 : i + 1];
                        p3 = kfValues[i > trackLen - 3 ? trackLen - 1 : i + 2];
                        if (interpolater) {
                            setter(
                                target,
                                propName, 
                                interpolater(
                                    getter(target, propName),
                                    p0, p1, p2, p3, w
                                )
                            );
                        } else if (isValueArray) {
                            _catmullRomInterpolateArray(
                                p0, p1, p2, p3, w, w*w, w*w*w,
                                getter(target, propName),
                                arrDim
                            );
                        } else {
                            setter(
                                target,
                                propName,
                                _catmullRomInterpolate(p0, p1, p2, p3, w, w*w, w*w*w)
                            );
                        }
                    } else {
                        if (interpolater) {
                            setter(
                                target,
                                propName, 
                                interpolater(
                                    getter(target, propName),
                                    kfValues[i],
                                    kfValues[i + 1],
                                    w
                                )
                            );
                        }
                        else if (isValueArray) {
                            _interpolateArray(
                                kfValues[i], kfValues[i+1], w,
                                getter(target, propName),
                                arrDim
                            );
                        } else {
                            setter(
                                target,
                                propName,
                                _interpolateNumber(kfValues[i], kfValues[i+1], w)
                            );
                        }
                    }

                    for (i = 0; i < onFrameListLen; i++) {
                        self._onframeList[i](target, percent);
                    }
                };

                var clip = new Clip({
                    target: self._target,
                    life: trackMaxTime,
                    loop: self._loop,
                    delay: self._delay,
                    onframe: onframe,
                    ondestroy: ondestroy
                });

                if (easing && easing !== 'spline') {
                    clip.setEasing(easing);
                }
                self._clipList.push(clip);
                self._clipCount++;
                self.animation.addClip(clip);
            };

            for (var propName in this._tracks) {
                createTrackClip(this._tracks[propName], propName);
            }
            return this;
        },
        /**
         * Stop the animation
         * @memberOf qtek.animation.Animation._Animator.prototype
         */
        stop: function() {
            for (var i = 0; i < this._clipList.length; i++) {
                var clip = this._clipList[i];
                this.animation.removeClip(clip);
            }
            this._clipList = [];
        },
        /**
         * Delay given milliseconds
         * @param  {number} time
         * @return {qtek.animation.Animation._Animator}
         * @memberOf qtek.animation.Animation._Animator.prototype
         */
        delay: function(time){
            this._delay = time;
            return this;
        },
        /**
         * Callback after animation finished
         * @param {Function} func
         * @return {qtek.animation.Animation._Animator}
         * @memberOf qtek.animation.Animation._Animator.prototype
         */
        done: function(func) {
            if (func) {
                this._doneList.push(func);
            }
            return this;
        },
        /**
         * Get all clips created in start method.
         * @return {qtek.animation.Clip[]}
         * @memberOf qtek.animation.Animation._Animator.prototype
         */
        getClips: function() {
            return this._clipList;
        }
    };

    Animation._Animator = Animator;

    return Animation;
});
