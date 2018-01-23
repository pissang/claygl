import Clip from './Clip';
import easingFuncs from './easing';

var arraySlice = Array.prototype.slice;

function defaultGetter(target, key) {
    return target[key];
}
function defaultSetter(target, key, value) {
    target[key] = value;
}

function interpolateNumber(p0, p1, percent) {
    return (p1 - p0) * percent + p0;
}

function interpolateArray(p0, p1, percent, out, arrDim) {
    var len = p0.length;
    if (arrDim == 1) {
        for (var i = 0; i < len; i++) {
            out[i] = interpolateNumber(p0[i], p1[i], percent);
        }
    }
    else {
        var len2 = p0[0].length;
        for (var i = 0; i < len; i++) {
            for (var j = 0; j < len2; j++) {
                out[i][j] = interpolateNumber(
                    p0[i][j], p1[i][j], percent
                );
            }
        }
    }
}

function isArrayLike(data) {
    if (typeof(data) == 'undefined') {
        return false;
    } else if (typeof(data) == 'string') {
        return false;
    } else {
        return typeof(data.length) == 'number';
    }
}

function cloneValue(value) {
    if (isArrayLike(value)) {
        var len = value.length;
        if (isArrayLike(value[0])) {
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

function catmullRomInterpolateArray(
    p0, p1, p2, p3, t, t2, t3, out, arrDim
) {
    var len = p0.length;
    if (arrDim == 1) {
        for (var i = 0; i < len; i++) {
            out[i] = catmullRomInterpolate(
                p0[i], p1[i], p2[i], p3[i], t, t2, t3
            );
        }
    } else {
        var len2 = p0[0].length;
        for (var i = 0; i < len; i++) {
            for (var j = 0; j < len2; j++) {
                out[i][j] = catmullRomInterpolate(
                    p0[i][j], p1[i][j], p2[i][j], p3[i][j],
                    t, t2, t3
                );
            }
        }
    }
}

function catmullRomInterpolate(p0, p1, p2, p3, t, t2, t3) {
    var v0 = (p2 - p0) * 0.5;
    var v1 = (p3 - p1) * 0.5;
    return (2 * (p1 - p2) + v0 + v1) * t3
            + (- 3 * (p1 - p2) - 2 * v0 - v1) * t2
            + v0 * t + p1;
}

// arr0 is source array, arr1 is target array.
// Do some preprocess to avoid error happened when interpolating from arr0 to arr1
function fillArr(arr0, arr1, arrDim) {
    var arr0Len = arr0.length;
    var arr1Len = arr1.length;
    if (arr0Len !== arr1Len) {
        // FIXME Not work for TypedArray
        var isPreviousLarger = arr0Len > arr1Len;
        if (isPreviousLarger) {
            // Cut the previous
            arr0.length = arr1Len;
        }
        else {
            // Fill the previous
            for (var i = arr0Len; i < arr1Len; i++) {
                arr0.push(
                    arrDim === 1 ? arr1[i] : arraySlice.call(arr1[i])
                );
            }
        }
    }
    // Handling NaN value
    var len2 = arr0[0] && arr0[0].length;
    for (var i = 0; i < arr0.length; i++) {
        if (arrDim === 1) {
            if (isNaN(arr0[i])) {
                arr0[i] = arr1[i];
            }
        }
        else {
            for (var j = 0; j < len2; j++) {
                if (isNaN(arr0[i][j])) {
                    arr0[i][j] = arr1[i][j];
                }
            }
        }
    }
}

function isArraySame(arr0, arr1, arrDim) {
    if (arr0 === arr1) {
        return true;
    }
    var len = arr0.length;
    if (len !== arr1.length) {
        return false;
    }
    if (arrDim === 1) {
        for (var i = 0; i < len; i++) {
            if (arr0[i] !== arr1[i]) {
                return false;
            }
        }
    }
    else {
        var len2 = arr0[0].length;
        for (var i = 0; i < len; i++) {
            for (var j = 0; j < len2; j++) {
                if (arr0[i][j] !== arr1[i][j]) {
                    return false;
                }
            }
        }
    }
    return true;
}

function createTrackClip(animator, globalEasing, oneTrackDone, keyframes, propName, interpolater, maxTime) {
    var getter = animator._getter;
    var setter = animator._setter;
    var useSpline = globalEasing === 'spline';

    var trackLen = keyframes.length;
    if (!trackLen) {
        return;
    }
    // Guess data type
    var firstVal = keyframes[0].value;
    var isValueArray = isArrayLike(firstVal);

    // For vertices morphing
    var arrDim = (
            isValueArray
            && isArrayLike(firstVal[0])
        )
        ? 2 : 1;
    // Sort keyframe as ascending
    keyframes.sort(function(a, b) {
        return a.time - b.time;
    });

    // Percents of each keyframe
    var kfPercents = [];
    // Value of each keyframe
    var kfValues = [];
    // Easing funcs of each keyframe.
    var kfEasings = [];

    var prevValue = keyframes[0].value;
    var isAllValueEqual = true;
    for (var i = 0; i < trackLen; i++) {
        kfPercents.push(keyframes[i].time / maxTime);

        // Assume value is a color when it is a string
        var value = keyframes[i].value;

        // Check if value is equal, deep check if value is array
        if (!((isValueArray && isArraySame(value, prevValue, arrDim))
            || (!isValueArray && value === prevValue))) {
            isAllValueEqual = false;
        }
        prevValue = value;

        kfValues.push(value);
        kfEasings.push(keyframes[i].easing);
    }
    if (isAllValueEqual) {
        return;
    }

    var lastValue = kfValues[trackLen - 1];
    // Polyfill array and NaN value
    for (var i = 0; i < trackLen - 1; i++) {
        if (isValueArray) {
            fillArr(kfValues[i], lastValue, arrDim);
        }
        else {
            if (isNaN(kfValues[i]) && !isNaN(lastValue)) {
                kfValues[i] = lastValue;
            }
        }
    }
    isValueArray && fillArr(getter(animator._target, propName), lastValue, arrDim);

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
        // find kf2(i) and kf3(i + 1) and do interpolation
        if (percent < cachePercent) {
            // Start from next key
            start = Math.min(cacheKey + 1, trackLen - 1);
            for (i = start; i >= 0; i--) {
                if (kfPercents[i] <= percent) {
                    break;
                }
            }
            i = Math.min(i, trackLen - 2);
        }
        else {
            for (i = cacheKey; i < trackLen; i++) {
                if (kfPercents[i] > percent) {
                    break;
                }
            }
            i = Math.min(i - 1, trackLen - 2);
        }
        cacheKey = i;
        cachePercent = percent;

        var range = (kfPercents[i + 1] - kfPercents[i]);
        if (range === 0) {
            return;
        }
        else {
            w = (percent - kfPercents[i]) / range;
            // Clamp 0 - 1
            w = Math.max(Math.min(1, w), 0);
        }
        w = kfEasings[i + 1](w);

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
            }
            else if (isValueArray) {
                catmullRomInterpolateArray(
                    p0, p1, p2, p3, w, w*w, w*w*w,
                    getter(target, propName),
                    arrDim
                );
            }
            else {
                setter(
                    target,
                    propName,
                    catmullRomInterpolate(p0, p1, p2, p3, w, w*w, w*w*w)
                );
            }
        }
        else {
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
                interpolateArray(
                    kfValues[i], kfValues[i+1], w,
                    getter(target, propName),
                    arrDim
                );
            }
            else {
                setter(
                    target,
                    propName,
                    interpolateNumber(kfValues[i], kfValues[i+1], w)
                );
            }
        }
    };

    var clip = new Clip({
        target: animator._target,
        life: maxTime,
        loop: animator._loop,
        delay: animator._delay,
        onframe: onframe,
        onfinish: oneTrackDone
    });

    if (globalEasing && globalEasing !== 'spline') {
        clip.setEasing(globalEasing);
    }

    return clip;
}

/**
 * @description Animator object can only be created by Animation.prototype.animate method.
 * After created, we can use {@link clay.animation.Animator#when} to add all keyframes and {@link clay.animation.Animator#start} it.
 * Clips will be automatically created and added to the animation instance which created this deferred object.
 *
 * @constructor clay.animation.Animator
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

    this._getter = getter || defaultGetter;
    this._setter = setter || defaultSetter;

    this._interpolater = interpolater || null;

    this._delay = 0;

    this._doneList = [];

    this._onframeList = [];

    this._clipList = [];

    this._maxTime = 0;

    this._lastKFTime = 0;
}

function noopEasing(w) {
    return w;
}

Animator.prototype = {

    constructor: Animator,

    /**
     * @param {number} time Keyframe time using millisecond
     * @param {Object} props A key-value object. Value can be number, 1d and 2d array
     * @param {string|Function} [easing]
     * @return {clay.animation.Animator}
     * @memberOf clay.animation.Animator.prototype
     */
    when: function (time, props, easing) {

        this._maxTime = Math.max(time, this._maxTime);

        easing = (typeof easing === 'function' ? easing : easingFuncs[easing]) || noopEasing;
        for (var propName in props) {
            if (!this._tracks[propName]) {
                this._tracks[propName] = [];
                // If time is 0
                //  Then props is given initialize value
                // Else
                //  Initialize value from current prop value
                if (time !== 0) {
                    this._tracks[propName].push({
                        time: 0,
                        value: cloneValue(
                            this._getter(this._target, propName)
                        ),
                        easing: easing
                    });
                }
            }
            this._tracks[propName].push({
                time: parseInt(time),
                value: props[propName],
                easing: easing
            });
        }
        return this;
    },
    /**
     * @param {number} time During time since last keyframe
     * @param {Object} props A key-value object. Value can be number, 1d and 2d array
     * @param {string|Function} [easing]
     * @return {clay.animation.Animator}
     * @memberOf clay.animation.Animator.prototype
     */
    then: function (duringTime, props, easing) {
        this.when(duringTime + this._lastKFTime, props, easing);
        this._lastKFTime += duringTime;
        return this;
    },
    /**
     * callback when running animation
     * @param  {Function} callback callback have two args, animating target and current percent
     * @return {clay.animation.Animator}
     * @memberOf clay.animation.Animator.prototype
     */
    during: function (callback) {
        this._onframeList.push(callback);
        return this;
    },

    _doneCallback: function () {
        // Clear all tracks
        this._tracks = {};
        // Clear all clips
        this._clipList.length = 0;

        var doneList = this._doneList;
        var len = doneList.length;
        for (var i = 0; i < len; i++) {
            doneList[i].call(this);
        }
    },
    /**
     * Start the animation
     * @param  {string|Function} easing
     * @return {clay.animation.Animator}
     * @memberOf clay.animation.Animator.prototype
     */
    start: function (globalEasing) {

        var self = this;
        var clipCount = 0;

        var oneTrackDone = function() {
            clipCount--;
            if (clipCount === 0) {
                self._doneCallback();
            }
        };

        var lastClip;
        var clipMaxTime = 0;
        for (var propName in this._tracks) {
            var clip = createTrackClip(
                this, globalEasing, oneTrackDone,
                this._tracks[propName], propName, self._interpolater, self._maxTime
            );
            if (clip) {
                clipMaxTime = Math.max(clipMaxTime, clip.life);
                this._clipList.push(clip);
                clipCount++;

                // If start after added to animation
                if (this.animation) {
                    this.animation.addClip(clip);
                }

                lastClip = clip;
            }
        }

        // Add during callback on the last clip
        if (lastClip) {
            var oldOnFrame = lastClip.onframe;
            lastClip.onframe = function (target, percent) {
                oldOnFrame(target, percent);

                for (var i = 0; i < self._onframeList.length; i++) {
                    self._onframeList[i](target, percent);
                }
            };
        }

        if (!clipCount) {
            this._doneCallback();
        }
        return this;
    },

    /**
     * Stop the animation
     * @memberOf clay.animation.Animator.prototype
     */
    stop: function () {
        for (var i = 0; i < this._clipList.length; i++) {
            var clip = this._clipList[i];
            this.animation.removeClip(clip);
        }
        this._clipList = [];
    },
    /**
     * Delay given milliseconds
     * @param  {number} time
     * @return {clay.animation.Animator}
     * @memberOf clay.animation.Animator.prototype
     */
    delay: function (time){
        this._delay = time;
        return this;
    },
    /**
     * Callback after animation finished
     * @param {Function} func
     * @return {clay.animation.Animator}
     * @memberOf clay.animation.Animator.prototype
     */
    done: function (func) {
        if (func) {
            this._doneList.push(func);
        }
        return this;
    },
    /**
     * Get all clips created in start method.
     * @return {clay.animation.Clip[]}
     * @memberOf clay.animation.Animator.prototype
     */
    getClips: function () {
        return this._clipList;
    }
};

export default Animator;
