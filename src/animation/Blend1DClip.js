// 1D Blend clip of blend tree
// http://docs.unity3d.com/Documentation/Manual/1DBlending.html

import Clip from './Clip';

var clipSortFunc = function (a, b) {
    return a.position < b.position;
};

/**
 * @typedef {Object} clay.animation.Blend1DClip.IClipInput
 * @property {number} position
 * @property {clay.animation.Clip} clip
 * @property {number} offset
 */

/**
 * 1d blending node in animation blend tree.
 * output clip must have blend1D and copy method
 * @constructor
 * @alias clay.animation.Blend1DClip
 * @extends clay.animation.Clip
 *
 * @param {Object} [opts]
 * @param {string} [opts.name]
 * @param {Object} [opts.target]
 * @param {number} [opts.life]
 * @param {number} [opts.delay]
 * @param {number} [opts.gap]
 * @param {number} [opts.playbackRatio]
 * @param {boolean|number} [opts.loop] If loop is a number, it indicate the loop count of animation
 * @param {string|Function} [opts.easing]
 * @param {Function} [opts.onframe]
 * @param {Function} [opts.onfinish]
 * @param {Function} [opts.onrestart]
 * @param {object[]} [opts.inputs]
 * @param {number} [opts.position]
 * @param {clay.animation.Clip} [opts.output]
 */
var Blend1DClip = function (opts) {

    opts = opts || {};

    Clip.call(this, opts);
    /**
     * Output clip must have blend1D and copy method
     * @type {clay.animation.Clip}
     */
    this.output = opts.output || null;
    /**
     * @type {clay.animation.Blend1DClip.IClipInput[]}
     */
    this.inputs = opts.inputs || [];
    /**
     * @type {number}
     */
    this.position = 0;

    this._cacheKey = 0;
    this._cachePosition = -Infinity;

    this.inputs.sort(clipSortFunc);
};

Blend1DClip.prototype = new Clip();
Blend1DClip.prototype.constructor = Blend1DClip;

/**
 * @param {number} position
 * @param {clay.animation.Clip} inputClip
 * @param {number} [offset]
 * @return {clay.animation.Blend1DClip.IClipInput}
 */
Blend1DClip.prototype.addInput = function (position, inputClip, offset) {
    var obj = {
        position: position,
        clip: inputClip,
        offset: offset || 0
    };
    this.life = Math.max(inputClip.life, this.life);

    if (!this.inputs.length) {
        this.inputs.push(obj);
        return obj;
    }
    var len = this.inputs.length;
    if (this.inputs[0].position > position) {
        this.inputs.unshift(obj);
    } else if (this.inputs[len - 1].position <= position) {
        this.inputs.push(obj);
    } else {
        var key = this._findKey(position);
        this.inputs.splice(key, obj);
    }

    return obj;
};

Blend1DClip.prototype.step = function (time, dTime, silent) {

    var ret = Clip.prototype.step.call(this, time);

    if (ret !== 'finish') {
        this.setTime(this.getElapsedTime());
    }

    // PENDING Schedule
    if (!silent && ret !== 'paused') {
        this.fire('frame');
    }
    return ret;
};

Blend1DClip.prototype.setTime = function (time) {
    var position = this.position;
    var inputs = this.inputs;
    var len = inputs.length;
    var min = inputs[0].position;
    var max = inputs[len-1].position;

    if (position <= min || position >= max) {
        var in0 = position <= min ? inputs[0] : inputs[len-1];
        var clip = in0.clip;
        var offset = in0.offset;
        clip.setTime((time + offset) % clip.life);
        // Input clip is a blend clip
        // PENDING
        if (clip.output instanceof Clip) {
            this.output.copy(clip.output);
        } else {
            this.output.copy(clip);
        }
    } else {
        var key = this._findKey(position);
        var in1 = inputs[key];
        var in2 = inputs[key + 1];
        var clip1 = in1.clip;
        var clip2 = in2.clip;
        // Set time on input clips
        clip1.setTime((time + in1.offset) % clip1.life);
        clip2.setTime((time + in2.offset) % clip2.life);

        var w = (this.position - in1.position) / (in2.position - in1.position);

        var c1 = clip1.output instanceof Clip ? clip1.output : clip1;
        var c2 = clip2.output instanceof Clip ? clip2.output : clip2;
        this.output.blend1D(c1, c2, w);
    }
};

/**
 * Clone a new Blend1D clip
 * @param {boolean} cloneInputs True if clone the input clips
 * @return {clay.animation.Blend1DClip}
 */
Blend1DClip.prototype.clone = function (cloneInputs) {
    var clip = Clip.prototype.clone.call(this);
    clip.output = this.output.clone();
    for (var i = 0; i < this.inputs.length; i++) {
        var inputClip = cloneInputs ? this.inputs[i].clip.clone(true) : this.inputs[i].clip;
        clip.addInput(this.inputs[i].position, inputClip, this.inputs[i].offset);
    }
    return clip;
};

// Find the key where position in range [inputs[key].position, inputs[key+1].position)
Blend1DClip.prototype._findKey = function (position) {
    var key = -1;
    var inputs = this.inputs;
    var len = inputs.length;
    if (this._cachePosition < position) {
        for (var i = this._cacheKey; i < len-1; i++) {
            if (position >= inputs[i].position && position < inputs[i+1].position) {
                key = i;
            }
        }
    } else {
        var s = Math.min(len-2, this._cacheKey);
        for (var i = s; i >= 0; i--) {
            if (position >= inputs[i].position && position < inputs[i+1].position) {
                key = i;
            }
        }
    }
    if (key >= 0) {
        this._cacheKey = key;
        this._cachePosition = position;
    }

    return key;
};

export default Blend1DClip;