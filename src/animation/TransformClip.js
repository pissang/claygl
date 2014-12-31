define(function(require) {

    'use strict';
    
    var Clip = require('./Clip');

    var glMatrix = require('../dep/glmatrix');
    var quat = glMatrix.quat;
    var vec3 = glMatrix.vec3;

    function keyframeSort(a, b) {
        return a.time - b.time;
    }

    /**
     * @constructor
     * @alias qtek.animation.TransformClip
     * @extends qtek.animation.Clip
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
     * @param {Function} [opts.ondestroy]
     * @param {Function} [opts.onrestart]
     * @param {object[]} [opts.keyFrames]
     */
    var TransformClip = function(opts) {
        
        opts = opts || {};

        Clip.call(this, opts);

        //[{
        //  time: //ms
        //  position:  // optional
        //  rotation:  // optional
        //  scale:     // optional
        //}]
        this.keyFrames = [];
        if (opts.keyFrames) {
            this.addKeyFrames(opts.keyFrames);
        }

        /**
         * @type {Float32Array}
         */
        this.position = vec3.create();
        /**
         * Rotation is represented by a quaternion
         * @type {Float32Array}
         */
        this.rotation = quat.create();
        /**
         * @type {Float32Array}
         */
        this.scale = vec3.fromValues(1, 1, 1);

        this._cacheKey = 0;
        this._cacheTime = 0;
    };

    TransformClip.prototype = Object.create(Clip.prototype);

    TransformClip.prototype.constructor = TransformClip;

    TransformClip.prototype.step = function(time) {

        var ret = Clip.prototype.step.call(this, time);

        if (ret !== 'destroy') {
            this.setTime(this._elapsedTime);
        }

        return ret;
    };

    TransformClip.prototype.setTime = function(time) {
        this._interpolateField(time, 'position');
        this._interpolateField(time, 'rotation');
        this._interpolateField(time, 'scale');   
    };
    /**
     * Add a key frame
     * @param {Object} kf
     */
    TransformClip.prototype.addKeyFrame = function(kf) {
        for (var i = 0; i < this.keyFrames.length - 1; i++) {
            var prevFrame = this.keyFrames[i];
            var nextFrame = this.keyFrames[i+1];
            if (prevFrame.time <= kf.time && nextFrame.time >= kf.time) {
                this.keyFrames.splice(i, 0, kf);
                return i;
            }
        }

        this.life = kf.time;
        this.keyFrames.push(kf);
    };

    /**
     * Add keyframes
     * @param {object[]} kfs
     */
    TransformClip.prototype.addKeyFrames = function(kfs) {
        for (var i = 0; i < kfs.length; i++) {
            this.keyFrames.push(kfs[i]);
        }

        this.keyFrames.sort(keyframeSort);

        this.life = this.keyFrames[this.keyFrames.length - 1].time;
    };

    TransformClip.prototype._interpolateField = function(time, fieldName) {
        var kfs = this.keyFrames;
        var len = kfs.length;
        var start;
        var end;

        if (!kfs.length) {
            return;
        }
        if (time < kfs[0].time || time > kfs[kfs.length-1].time) {
            return;
        }
        if (time < this._cacheTime) {
            var s = this._cacheKey >= len-1 ? len-1 : this._cacheKey+1;
            for (var i = s; i >= 0; i--) {
                if (kfs[i].time <= time && kfs[i][fieldName]) {
                    start = kfs[i];
                    this._cacheKey = i;
                    this._cacheTime = time;
                } else if (kfs[i][fieldName]) {
                    end = kfs[i];
                    break;
                }
            }
        } else {
            for (var i = this._cacheKey; i < len; i++) {
                if (kfs[i].time <= time && kfs[i][fieldName]) {
                    start = kfs[i];
                    this._cacheKey = i;
                    this._cacheTime = time;
                } else if (kfs[i][fieldName]) {
                    end = kfs[i];
                    break;
                }
            }
        }

        if (start && end) {
            var percent = (time-start.time) / (end.time-start.time);
            percent = Math.max(Math.min(percent, 1), 0);
            if (fieldName === 'rotation') {
                quat.slerp(this[fieldName], start[fieldName], end[fieldName], percent);
            } else {
                vec3.lerp(this[fieldName], start[fieldName], end[fieldName], percent);
            }
        } else {
            this._cacheKey = 0;
            this._cacheTime = 0;
        }
    };
    /**
     * 1D blending between two clips
     * @param  {qtek.animation.SamplerClip|qtek.animation.TransformClip} c1
     * @param  {qtek.animation.SamplerClip|qtek.animation.TransformClip} c2
     * @param  {number} w
     */
    TransformClip.prototype.blend1D = function(c1, c2, w) {
        vec3.lerp(this.position, c1.position, c2.position, w);
        vec3.lerp(this.scale, c1.scale, c2.scale, w);
        quat.slerp(this.rotation, c1.rotation, c2.rotation, w);
    };

    /**
     * 2D blending between three clips
     * @method
     * @param  {qtek.animation.SamplerClip|qtek.animation.TransformClip} c1
     * @param  {qtek.animation.SamplerClip|qtek.animation.TransformClip} c2
     * @param  {qtek.animation.SamplerClip|qtek.animation.TransformClip} c3
     * @param  {number} f
     * @param  {number} g
     */
    TransformClip.prototype.blend2D = (function() {
        var q1 = quat.create();
        var q2 = quat.create();
        return function(c1, c2, c3, f, g) {
            var a = 1 - f - g;

            this.position[0] = c1.position[0] * a + c2.position[0] * f + c3.position[0] * g;
            this.position[1] = c1.position[1] * a + c2.position[1] * f + c3.position[1] * g;
            this.position[2] = c1.position[2] * a + c2.position[2] * f + c3.position[2] * g;

            this.scale[0] = c1.scale[0] * a + c2.scale[0] * f + c3.scale[0] * g;
            this.scale[1] = c1.scale[1] * a + c2.scale[1] * f + c3.scale[1] * g;
            this.scale[2] = c1.scale[2] * a + c2.scale[2] * f + c3.scale[2] * g;

            // http://msdn.microsoft.com/en-us/library/windows/desktop/bb205403(v=vs.85).aspx
            // http://msdn.microsoft.com/en-us/library/windows/desktop/microsoft.directx_sdk.quaternion.xmquaternionbarycentric(v=vs.85).aspx
            var s = f + g;
            if (s === 0) {
                quat.copy(this.rotation, c1.rotation);
            } else {
                quat.slerp(q1, c1.rotation, c2.rotation, s);
                quat.slerp(q2, c1.rotation, c3.rotation, s);
                quat.slerp(this.rotation, q1, q2, g / s);
            }
        };
    })();

    /**
     * Additive blending between two clips
     * @param  {qtek.animation.SamplerClip|qtek.animation.TransformClip} c1
     * @param  {qtek.animation.SamplerClip|qtek.animation.TransformClip} c2
     */
    TransformClip.prototype.additiveBlend = function(c1, c2) {
        vec3.add(this.position, c1.position, c2.position);
        vec3.add(this.scale, c1.scale, c2.scale);
        quat.multiply(this.rotation, c2.rotation, c1.rotation);
    };

    /**
     * Subtractive blending between two clips
     * @param  {qtek.animation.SamplerClip|qtek.animation.TransformClip} c1
     * @param  {qtek.animation.SamplerClip|qtek.animation.TransformClip} c2
     */
    TransformClip.prototype.subtractiveBlend = function(c1, c2) {
        vec3.sub(this.position, c1.position, c2.position);
        vec3.sub(this.scale, c1.scale, c2.scale);
        quat.invert(this.rotation, c2.rotation);
        quat.multiply(this.rotation, this.rotation, c1.rotation);
    };

    /**
     * @param {number} startTime
     * @param {number} endTime
     * @param {boolean} isLoop
     */
    TransformClip.prototype.getSubClip = function(startTime, endTime) {
        // TODO
        console.warn('TODO');
    };

    /**
     * Clone a new TransformClip
     * @return {qtek.animation.TransformClip}
     */
    TransformClip.prototype.clone = function () {
        var clip = Clip.prototype.clone.call(this);
        clip.keyFrames = this.keyFrames;

        vec3.copy(clip.position, this.position);
        quat.copy(clip.rotation, this.rotation);
        vec3.copy(clip.scale, this.scale);

        return clip;
    };


    return TransformClip;
});