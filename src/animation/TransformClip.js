define(function(require) {

    'use strict';
    
    var Clip = require('./Clip');

    var glMatrix = require("glmatrix");
    var quat = glMatrix.quat;
    var vec3 = glMatrix.vec3;

    function keyframeSort(a, b) {
        return a.time - b.time;
    }

    var TransformClip = function(options) {
        
        options = options || {};

        this.name = options.name || '';

        Clip.call(this, options);

        //[{
        //  time : //ms
        //  position :  // optional
        //  rotation :  // optional
        //  scale :     // optional
        //}]
        this.keyFrames = []
        if (options.keyFrames) {
            this.addKeyFrames(options.keyFrames)
        }

        this.position = vec3.create();
        this.rotation = quat.create();
        this.scale = vec3.fromValues(1, 1, 1);

        this._cacheKey = 0;
        this._cacheTime = 0;
    }

    TransformClip.prototype = Object.create(Clip.prototype);

    TransformClip.prototype.constructor = TransformClip;

    TransformClip.prototype.step = function(time) {

        var ret = Clip.prototype.step.call(this, time);

        if (ret !== 'destroy') {
            var deltaTime = time - this._startTime;
            this.setTime(deltaTime);
        }

        return ret;
    }

    TransformClip.prototype.setTime = function(time) {
        this._interpolateField(time, 'position');
        this._interpolateField(time, 'rotation');
        this._interpolateField(time, 'scale');   
    }

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
    }

    TransformClip.prototype.addKeyFrames = function(kfs) {
        for (var i = 0; i < kfs.length; i++) {
            this.keyFrames.push(kfs[i]);
        }

        this.keyFrames.sort(keyframeSort);

        this.life = this.keyFrames[this.keyFrames.length - 1].time;
    }

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
            if (fieldName === "rotation") {
                quat.slerp(this[fieldName], start[fieldName], end[fieldName], percent);
            } else {
                vec3.lerp(this[fieldName], start[fieldName], end[fieldName], percent);
            }
        } else {
            this._cacheKey = 0;
            this._cacheTime = 0;
        }
    }

    TransformClip.prototype.getSubClip = function(startTime, endTime) {
        // TODO
    }

    return TransformClip;
});