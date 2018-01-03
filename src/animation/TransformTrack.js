import Clip from './Clip';

import glMatrix from '../dep/glmatrix';
var quat = glMatrix.quat;
var vec3 = glMatrix.vec3;

function keyframeSort(a, b) {
    return a.time - b.time;
}

var TransformTrack = function (opts) {

    this.name = opts.name || '';
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

    this.position = vec3.create();

    this.rotation = quat.create();

    this.scale = vec3.fromValues(1, 1, 1);

    this._cacheKey = 0;
    this._cacheTime = 0;
};

TransformTrack.prototype = Object.create(Clip.prototype);

TransformTrack.prototype.constructor = TransformTrack;

TransformTrack.prototype.step = function (time, dTime, silent) {

    var ret = Clip.prototype.step.call(this, time, dTime, true);

    if (ret !== 'finish') {
        this.setTime(this.getElapsedTime());
    }

    // PENDING Schedule
    if (!silent && ret !== 'paused') {
        this.fire('frame');
    }

    return ret;
};

TransformTrack.prototype.setTime = function (time) {
    this._interpolateField(time, 'position');
    this._interpolateField(time, 'rotation');
    this._interpolateField(time, 'scale');
};

TransformTrack.prototype.getMaxTime = function () {
    var kf = this.keyFrames[this.keyFrames.length - 1];
    return kf ? kf.time : 0;
};

TransformTrack.prototype.addKeyFrame = function (kf) {
    for (var i = 0; i < this.keyFrames.length - 1; i++) {
        var prevFrame = this.keyFrames[i];
        var nextFrame = this.keyFrames[i + 1];
        if (prevFrame.time <= kf.time && nextFrame.time >= kf.time) {
            this.keyFrames.splice(i, 0, kf);
            return i;
        }
    }

    this.life = kf.time;
    this.keyFrames.push(kf);
};

TransformTrack.prototype.addKeyFrames = function (kfs) {
    for (var i = 0; i < kfs.length; i++) {
        this.keyFrames.push(kfs[i]);
    }

    this.keyFrames.sort(keyframeSort);

    this.life = this.keyFrames[this.keyFrames.length - 1].time;
};

TransformTrack.prototype._interpolateField = function (time, fieldName) {
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
        var percent = (time - start.time) / (end.time - start.time);
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

TransformTrack.prototype.blend1D = function (t1, t2, w) {
    vec3.lerp(this.position, t1.position, t2.position, w);
    vec3.lerp(this.scale, t1.scale, t2.scale, w);
    quat.slerp(this.rotation, t1.rotation, t2.rotation, w);
};

TransformTrack.prototype.blend2D = (function () {
    var q1 = quat.create();
    var q2 = quat.create();
    return function (t1, t2, t3, f, g) {
        var a = 1 - f - g;

        this.position[0] = t1.position[0] * a + t2.position[0] * f + t3.position[0] * g;
        this.position[1] = t1.position[1] * a + t2.position[1] * f + t3.position[1] * g;
        this.position[2] = t1.position[2] * a + t2.position[2] * f + t3.position[2] * g;

        this.scale[0] = t1.scale[0] * a + t2.scale[0] * f + t3.scale[0] * g;
        this.scale[1] = t1.scale[1] * a + t2.scale[1] * f + t3.scale[1] * g;
        this.scale[2] = t1.scale[2] * a + t2.scale[2] * f + t3.scale[2] * g;

        // http://msdn.microsoft.com/en-us/library/windows/desktop/bb205403(v=vs.85).aspx
        // http://msdn.microsoft.com/en-us/library/windows/desktop/microsoft.directx_sdk.quaternion.xmquaternionbarycentric(v=vs.85).aspx
        var s = f + g;
        if (s === 0) {
            quat.copy(this.rotation, t1.rotation);
        } else {
            quat.slerp(q1, t1.rotation, t2.rotation, s);
            quat.slerp(q2, t1.rotation, c3.rotation, s);
            quat.slerp(this.rotation, q1, q2, g / s);
        }
    };
})();

TransformTrack.prototype.additiveBlend = function (t1, t2) {
    vec3.add(this.position, t1.position, t2.position);
    vec3.add(this.scale, t1.scale, t2.scale);
    quat.multiply(this.rotation, t2.rotation, t1.rotation);
};

TransformTrack.prototype.subtractiveBlend = function (t1, t2) {
    vec3.sub(this.position, t1.position, t2.position);
    vec3.sub(this.scale, t1.scale, t2.scale);
    quat.invert(this.rotation, t2.rotation);
    quat.multiply(this.rotation, this.rotation, t1.rotation);
};

TransformTrack.prototype.getSubClip = function (startTime, endTime) {
    // TODO
    console.warn('TODO');
};

TransformTrack.prototype.clone = function () {
    var track = TransformTrack.prototype.clone.call(this);
    track.keyFrames = this.keyFrames;

    vec3.copy(track.position, this.position);
    quat.copy(track.rotation, this.rotation);
    vec3.copy(track.scale, this.scale);

    return track;
};


export default TransformTrack;
