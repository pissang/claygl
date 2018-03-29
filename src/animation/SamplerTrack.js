// Sampler clip is especially for the animation sampler in glTF
// Use Typed Array can reduce a lot of heap memory

import quat from '../glmatrix/quat';
import vec3 from '../glmatrix/vec3';

// lerp function with offset in large array
function vec3lerp(out, a, b, t, oa, ob) {
    var ax = a[oa];
    var ay = a[oa + 1];
    var az = a[oa + 2];
    out[0] = ax + t * (b[ob] - ax);
    out[1] = ay + t * (b[ob + 1] - ay);
    out[2] = az + t * (b[ob + 2] - az);

    return out;
}

function quatSlerp(out, a, b, t, oa, ob) {
    // benchmarks:
    //    http://jsperf.com/quaternion-slerp-implementations

    var ax = a[0 + oa], ay = a[1 + oa], az = a[2 + oa], aw = a[3 + oa],
        bx = b[0 + ob], by = b[1 + ob], bz = b[2 + ob], bw = b[3 + ob];

    var omega, cosom, sinom, scale0, scale1;

    // calc cosine
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    // adjust signs (if necessary)
    if (cosom < 0.0) {
        cosom = -cosom;
        bx = - bx;
        by = - by;
        bz = - bz;
        bw = - bw;
    }
    // calculate coefficients
    if ((1.0 - cosom) > 0.000001) {
        // standard case (slerp)
        omega  = Math.acos(cosom);
        sinom  = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    }
    else {
        // 'from' and 'to' quaternions are very close
        //  ... so we can do a linear interpolation
        scale0 = 1.0 - t;
        scale1 = t;
    }
    // calculate final values
    out[0] = scale0 * ax + scale1 * bx;
    out[1] = scale0 * ay + scale1 * by;
    out[2] = scale0 * az + scale1 * bz;
    out[3] = scale0 * aw + scale1 * bw;

    return out;
}

/**
 * SamplerTrack manages `position`, `rotation`, `scale` tracks in animation of single scene node.
 * @constructor
 * @alias clay.animation.SamplerTrack
 * @param {Object} [opts]
 * @param {string} [opts.name] Track name
 * @param {clay.Node} [opts.target] Target node's transform will updated automatically
 */
var SamplerTrack = function (opts) {
    opts = opts || {};

    this.name = opts.name || '';
    /**
     * @param {clay.Node}
     */
    this.target = opts.target || null;
    /**
     * @type {Array}
     */
    this.position = vec3.create();
    /**
     * Rotation is represented by a quaternion
     * @type {Array}
     */
    this.rotation = quat.create();
    /**
     * @type {Array}
     */
    this.scale = vec3.fromValues(1, 1, 1);

    this.channels = {
        time: null,
        position: null,
        rotation: null,
        scale: null
    };

    this._cacheKey = 0;
    this._cacheTime = 0;
};

SamplerTrack.prototype.setTime = function (time) {
    if (!this.channels.time) {
        return;
    }
    var channels = this.channels;
    var len = channels.time.length;
    var key = -1;
    // Only one frame
    if (len === 1) {
        if (channels.rotation) {
            quat.copy(this.rotation, channels.rotation);
        }
        if (channels.position) {
            vec3.copy(this.position, channels.position);
        }
        if (channels.scale) {
            vec3.copy(this.scale, channels.scale);
        }
        return;
    }
    // Clamp
    else if (time <= channels.time[0]) {
        time = channels.time[0];
        key = 0;
    }
    else if (time >= channels.time[len - 1]) {
        time = channels.time[len - 1];
        key = len - 2;
    }
    else {
        if (time < this._cacheTime) {
            var s = Math.min(len - 1, this._cacheKey + 1);
            for (var i = s; i >= 0; i--) {
                if (channels.time[i - 1] <= time && channels.time[i] > time) {
                    key = i - 1;
                    break;
                }
            }
        }
        else {
            for (var i = this._cacheKey; i < len - 1; i++) {
                if (channels.time[i] <= time && channels.time[i + 1] > time) {
                    key = i;
                    break;
                }
            }
        }
    }
    if (key > -1) {
        this._cacheKey = key;
        this._cacheTime = time;
        var start = key;
        var end = key + 1;
        var startTime = channels.time[start];
        var endTime = channels.time[end];
        var range = endTime - startTime;
        var percent = range === 0 ? 0 : (time - startTime) / range;

        if (channels.rotation) {
            quatSlerp(this.rotation, channels.rotation, channels.rotation, percent, start * 4, end * 4);
        }
        if (channels.position) {
            vec3lerp(this.position, channels.position, channels.position, percent, start * 3, end * 3);
        }
        if (channels.scale) {
            vec3lerp(this.scale, channels.scale, channels.scale, percent, start * 3, end * 3);
        }
    }
    // Loop handling
    if (key === len - 2) {
        this._cacheKey = 0;
        this._cacheTime = 0;
    }

    this.updateTarget();
};

/**
 * Update transform of target node manually
 */
SamplerTrack.prototype.updateTarget = function () {
    var channels = this.channels;
    if (this.target) {
        // Only update target prop if have data.
        if (channels.position) {
            this.target.position.setArray(this.position);
        }
        if (channels.rotation) {
            this.target.rotation.setArray(this.rotation);
        }
        if (channels.scale) {
            this.target.scale.setArray(this.scale);
        }
    }
};

/**
 * @return {number}
 */
SamplerTrack.prototype.getMaxTime = function () {
    return this.channels.time[this.channels.time.length - 1];
};

/**
 * @param {number} startTime
 * @param {number} endTime
 * @return {clay.animation.SamplerTrack}
 */
SamplerTrack.prototype.getSubTrack = function (startTime, endTime) {

    var subClip = new SamplerTrack({
        name: this.name
    });
    var minTime = this.channels.time[0];
    startTime = Math.min(Math.max(startTime, minTime), this.life);
    endTime = Math.min(Math.max(endTime, minTime), this.life);

    var rangeStart = this._findRange(startTime);
    var rangeEnd = this._findRange(endTime);

    var count = rangeEnd[0] - rangeStart[0] + 1;
    if (rangeStart[1] === 0 && rangeEnd[1] === 0) {
        count -= 1;
    }
    if (this.channels.rotation) {
        subClip.channels.rotation = new Float32Array(count * 4);
    }
    if (this.channels.position) {
        subClip.channels.position = new Float32Array(count * 3);
    }
    if (this.channels.scale) {
        subClip.channels.scale = new Float32Array(count * 3);
    }
    if (this.channels.time) {
        subClip.channels.time = new Float32Array(count);
    }
    // Clip at the start
    this.setTime(startTime);
    for (var i = 0; i < 3; i++) {
        subClip.channels.rotation[i] = this.rotation[i];
        subClip.channels.position[i] = this.position[i];
        subClip.channels.scale[i] = this.scale[i];
    }
    subClip.channels.time[0] = 0;
    subClip.channels.rotation[3] = this.rotation[3];

    for (var i = 1; i < count-1; i++) {
        var i2;
        for (var j = 0; j < 3; j++) {
            i2 = rangeStart[0] + i;
            subClip.channels.rotation[i * 4 + j] = this.channels.rotation[i2 * 4 + j];
            subClip.channels.position[i * 3 + j] = this.channels.position[i2 * 3 + j];
            subClip.channels.scale[i * 3 + j] = this.channels.scale[i2 * 3 + j];
        }
        subClip.channels.time[i] = this.channels.time[i2] - startTime;
        subClip.channels.rotation[i * 4 + 3] = this.channels.rotation[i2 * 4 + 3];
    }
    // Clip at the end
    this.setTime(endTime);
    for (var i = 0; i < 3; i++) {
        subClip.channels.rotation[(count - 1) * 4 + i] = this.rotation[i];
        subClip.channels.position[(count - 1) * 3 + i] = this.position[i];
        subClip.channels.scale[(count - 1) * 3 + i] = this.scale[i];
    }
    subClip.channels.time[(count - 1)] = endTime - startTime;
    subClip.channels.rotation[(count - 1) * 4 + 3] = this.rotation[3];

    // TODO set back ?
    subClip.life = endTime - startTime;
    return subClip;
};

SamplerTrack.prototype._findRange = function (time) {
    var channels = this.channels;
    var len = channels.time.length;
    var start = -1;
    for (var i = 0; i < len - 1; i++) {
        if (channels.time[i] <= time && channels.time[i+1] > time) {
            start = i;
        }
    }
    var percent = 0;
    if (start >= 0) {
        var startTime = channels.time[start];
        var endTime = channels.time[start+1];
        var percent = (time-startTime) / (endTime-startTime);
    }
    // Percent [0, 1)
    return [start, percent];
};

/**
 * 1D blending between two clips
 * @function
 * @param  {clay.animation.SamplerTrack|clay.animation.TransformTrack} c1
 * @param  {clay.animation.SamplerTrack|clay.animation.TransformTrack} c2
 * @param  {number} w
 */
SamplerTrack.prototype.blend1D = function (t1, t2, w) {
    vec3.lerp(this.position, t1.position, t2.position, w);
    vec3.lerp(this.scale, t1.scale, t2.scale, w);
    quat.slerp(this.rotation, t1.rotation, t2.rotation, w);
};
/**
 * 2D blending between three clips
 * @function
 * @param  {clay.animation.SamplerTrack|clay.animation.TransformTrack} c1
 * @param  {clay.animation.SamplerTrack|clay.animation.TransformTrack} c2
 * @param  {clay.animation.SamplerTrack|clay.animation.TransformTrack} c3
 * @param  {number} f
 * @param  {number} g
 */
SamplerTrack.prototype.blend2D = (function () {
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
        }
        else {
            quat.slerp(q1, t1.rotation, t2.rotation, s);
            quat.slerp(q2, t1.rotation, t3.rotation, s);
            quat.slerp(this.rotation, q1, q2, g / s);
        }
    };
})();
/**
 * Additive blending between two clips
 * @function
 * @param  {clay.animation.SamplerTrack|clay.animation.TransformTrack} c1
 * @param  {clay.animation.SamplerTrack|clay.animation.TransformTrack} c2
 */
SamplerTrack.prototype.additiveBlend = function (t1, t2) {
    vec3.add(this.position, t1.position, t2.position);
    vec3.add(this.scale, t1.scale, t2.scale);
    quat.multiply(this.rotation, t2.rotation, t1.rotation);
};
/**
 * Subtractive blending between two clips
 * @function
 * @param  {clay.animation.SamplerTrack|clay.animation.TransformTrack} c1
 * @param  {clay.animation.SamplerTrack|clay.animation.TransformTrack} c2
 */
SamplerTrack.prototype.subtractiveBlend = function (t1, t2) {
    vec3.sub(this.position, t1.position, t2.position);
    vec3.sub(this.scale, t1.scale, t2.scale);
    quat.invert(this.rotation, t2.rotation);
    quat.multiply(this.rotation, this.rotation, t1.rotation);
};

/**
 * Clone a new SamplerTrack
 * @return {clay.animation.SamplerTrack}
 */
SamplerTrack.prototype.clone = function () {
    var track = SamplerTrack.prototype.clone.call(this);
    track.channels = {
        time: this.channels.time || null,
        position: this.channels.position || null,
        rotation: this.channels.rotation || null,
        scale: this.channels.scale || null
    };
    vec3.copy(track.position, this.position);
    quat.copy(track.rotation, this.rotation);
    vec3.copy(track.scale, this.scale);

    track.target = this.target;
    track.updateTarget();

    return track;

};

export default SamplerTrack;
