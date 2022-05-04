// Sampler clip is especially for the animation sampler in glTF
// Use Typed Array can reduce a lot of heap memory

import * as quat from '../glmatrix/quat';
import * as vec3 from '../glmatrix/vec3';
import ClayNode from '../Node';

const q1 = quat.create();
const q2 = quat.create();

// lerp function with offset in large array
function vec3lerp(
  out: vec3.Vec3Array,
  a: Float32Array,
  b: Float32Array,
  t: number,
  oa: number,
  ob: number
) {
  const ax = a[oa];
  const ay = a[oa + 1];
  const az = a[oa + 2];
  out[0] = ax + t * (b[ob] - ax);
  out[1] = ay + t * (b[ob + 1] - ay);
  out[2] = az + t * (b[ob + 2] - az);

  return out;
}

function quatSlerp(
  out: quat.QuatArray,
  a: Float32Array,
  b: Float32Array,
  t: number,
  oa: number,
  ob: number
) {
  // benchmarks:
  //    http://jsperf.com/quaternion-slerp-implementations

  const ax = a[0 + oa],
    ay = a[1 + oa],
    az = a[2 + oa],
    aw = a[3 + oa];
  let bx = b[0 + ob],
    by = b[1 + ob],
    bz = b[2 + ob],
    bw = b[3 + ob];

  let omega, cosom, sinom, scale0, scale1;

  // calc cosine
  cosom = ax * bx + ay * by + az * bz + aw * bw;
  // adjust signs (if necessary)
  if (cosom < 0.0) {
    cosom = -cosom;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  }
  // calculate coefficients
  if (1.0 - cosom > 0.000001) {
    // standard case (slerp)
    omega = Math.acos(cosom);
    sinom = Math.sin(omega);
    scale0 = Math.sin((1.0 - t) * omega) / sinom;
    scale1 = Math.sin(t * omega) / sinom;
  } else {
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

interface SamplerTrackOpts {
  name?: string;
  target?: ClayNode;
}

/**
 * SamplerTrack manages `position`, `rotation`, `scale` tracks in animation of single scene node.
 * @constructor
 * @alias clay.animation.SamplerTrack
 * @param {Object} [opts]
 * @param {string} [opts.name] Track name
 * @param {clay.Node} [opts.target] Target node's transform will updated automatically
 */
class SamplerTrack {
  name?: string;

  target?: ClayNode;

  position = vec3.create();
  rotation = quat.create();
  scale = vec3.fromValues(1, 1, 1);

  channels = {} as {
    time: Float32Array;
    position?: Float32Array;
    rotation?: Float32Array;
    scale?: Float32Array;
  };

  life: number = 0;

  private _cacheKey = 0;
  private _cacheTime = 0;

  constructor(opts?: SamplerTrackOpts) {
    opts = opts || {};
    this.name = opts.name || '';
    this.target = opts.target;
  }

  setTime(time: number) {
    if (!this.channels.time) {
      return;
    }
    const channels = this.channels;
    const len = channels.time.length;
    let key = -1;
    // Only one frame
    if (len === 1) {
      if (channels.rotation) {
        quat.copy(this.rotation, channels.rotation as any);
      }
      if (channels.position) {
        vec3.copy(this.position, channels.position as any);
      }
      if (channels.scale) {
        vec3.copy(this.scale, channels.scale as any);
      }
      return;
    }
    // Clamp
    else if (time <= channels.time[0]) {
      time = channels.time[0];
      key = 0;
    } else if (time >= channels.time[len - 1]) {
      time = channels.time[len - 1];
      key = len - 2;
    } else {
      if (time < this._cacheTime) {
        const s = Math.min(len - 1, this._cacheKey + 1);
        for (let i = s; i >= 0; i--) {
          if (channels.time[i - 1] <= time && channels.time[i] > time) {
            key = i - 1;
            break;
          }
        }
      } else {
        for (let i = this._cacheKey; i < len - 1; i++) {
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
      const start = key;
      const end = key + 1;
      const startTime = channels.time[start];
      const endTime = channels.time[end];
      const range = endTime - startTime;
      const percent = range === 0 ? 0 : (time - startTime) / range;
      const positionChannel = channels.position;
      const rotationChannel = channels.rotation;
      const scaleChannel = channels.scale;

      if (rotationChannel) {
        quatSlerp(this.rotation, rotationChannel, rotationChannel, percent, start * 4, end * 4);
      }
      if (positionChannel) {
        vec3lerp(this.position, positionChannel, positionChannel, percent, start * 3, end * 3);
      }
      if (scaleChannel) {
        vec3lerp(this.scale, scaleChannel, scaleChannel, percent, start * 3, end * 3);
      }
    }

    // Loop handling
    if (key === len - 2) {
      this._cacheKey = 0;
      this._cacheTime = 0;
    }

    this.updateTarget();
  }
  /**
   * Update transform of target node manually
   */
  updateTarget() {
    const channels = this.channels;
    const target = this.target;
    if (target) {
      // Only update target prop if have data.
      if (channels.position) {
        target.position.setArray(this.position);
      }
      if (channels.rotation) {
        target.rotation.setArray(this.rotation);
      }
      if (channels.scale) {
        target.scale.setArray(this.scale);
      }
    }
  }

  /**
   * @return {number}
   */
  getMaxTime() {
    return this.channels.time[this.channels.time.length - 1];
  }

  /**
   * @param {number} startTime
   * @param {number} endTime
   * @return {clay.animation.SamplerTrack}
   */
  getSubTrack(startTime: number, endTime: number) {
    const subTrack = new SamplerTrack({
      name: this.name
    });
    const channels = this.channels;
    const minTime = channels.time[0];
    startTime = Math.min(Math.max(startTime, minTime), this.life);
    endTime = Math.min(Math.max(endTime, minTime), this.life);

    const rangeStart = this._findRange(startTime);
    const rangeEnd = this._findRange(endTime);

    let count = rangeEnd[0] - rangeStart[0] + 1;
    if (rangeStart[1] === 0 && rangeEnd[1] === 0) {
      count -= 1;
    }
    const rotationChannel = channels.rotation;
    const positionChannel = channels.position;
    const scaleChannel = channels.scale;
    const subTrackChannels = subTrack.channels;
    if (rotationChannel) {
      subTrackChannels.rotation = new Float32Array(count * 4);
    }
    if (positionChannel) {
      subTrackChannels.position = new Float32Array(count * 3);
    }
    if (scaleChannel) {
      subTrackChannels.scale = new Float32Array(count * 3);
    }
    if (this.channels.time) {
      subTrackChannels.time = new Float32Array(count);
    }
    // Clip at the start
    this.setTime(startTime);
    for (let i = 0; i < 3; i++) {
      if (subTrackChannels.rotation) {
        subTrackChannels.rotation[i] = this.rotation[i];
      }
      if (subTrackChannels.position) {
        subTrackChannels.position[i] = this.position[i];
      }
      if (subTrackChannels.scale) {
        subTrackChannels.scale[i] = this.scale[i];
      }
    }
    subTrackChannels.time[0] = 0;
    if (subTrackChannels.rotation) {
      subTrackChannels.rotation[3] = this.rotation[3];
    }

    for (let i = 1; i < count - 1; i++) {
      let i2 = 0;
      for (let j = 0; j < 3; j++) {
        i2 = rangeStart[0] + i;
        if (rotationChannel) {
          subTrack.channels.rotation![i * 4 + j] = rotationChannel[i2 * 4 + j];
        }
        if (positionChannel) {
          subTrack.channels.position![i * 3 + j] = positionChannel[i2 * 3 + j];
        }
        if (scaleChannel) {
          subTrack.channels.scale![i * 3 + j] = scaleChannel[i2 * 3 + j];
        }
      }
      subTrackChannels.time[i] = this.channels.time[i2] - startTime;
      if (rotationChannel!) {
        subTrackChannels.rotation![i * 4 + 3] = rotationChannel[i2 * 4 + 3];
      }
    }
    // Clip at the end
    this.setTime(endTime);
    for (let i = 0; i < 3; i++) {
      if (subTrackChannels.rotation) {
        subTrackChannels.rotation[(count - 1) * 4 + i] = this.rotation[i];
      }
      if (subTrackChannels.position) {
        subTrackChannels.position[(count - 1) * 3 + i] = this.position[i];
      }
      if (subTrackChannels.scale) {
        subTrackChannels.scale[(count - 1) * 3 + i] = this.scale[i];
      }
    }
    subTrackChannels.time[count - 1] = endTime - startTime;

    if (subTrackChannels.rotation) {
      subTrackChannels.rotation[(count - 1) * 4 + 3] = this.rotation[3];
    }

    // TODO set back ?
    subTrack.life = endTime - startTime;
    return subTrack;
  }

  _findRange(time: number) {
    const channels = this.channels;
    const len = channels.time.length;
    let start = -1;
    for (let i = 0; i < len - 1; i++) {
      if (channels.time[i] <= time && channels.time[i + 1] > time) {
        start = i;
      }
    }
    let percent = 0;
    if (start >= 0) {
      const startTime = channels.time[start];
      const endTime = channels.time[start + 1];
      percent = (time - startTime) / (endTime - startTime);
    }
    // Percent [0, 1)
    return [start, percent];
  }

  /**
   * 1D blending between two clips
   */
  blend1D(t1: SamplerTrack, t2: SamplerTrack, w: number) {
    vec3.lerp(this.position, t1.position, t2.position, w);
    vec3.lerp(this.scale, t1.scale, t2.scale, w);
    quat.slerp(this.rotation, t1.rotation, t2.rotation, w);
  }
  /**
   * 2D blending between three clips
   */
  blend2D(t1: SamplerTrack, t2: SamplerTrack, t3: SamplerTrack, f: number, g: number) {
    const a = 1 - f - g;

    this.position[0] = t1.position[0] * a + t2.position[0] * f + t3.position[0] * g;
    this.position[1] = t1.position[1] * a + t2.position[1] * f + t3.position[1] * g;
    this.position[2] = t1.position[2] * a + t2.position[2] * f + t3.position[2] * g;

    this.scale[0] = t1.scale[0] * a + t2.scale[0] * f + t3.scale[0] * g;
    this.scale[1] = t1.scale[1] * a + t2.scale[1] * f + t3.scale[1] * g;
    this.scale[2] = t1.scale[2] * a + t2.scale[2] * f + t3.scale[2] * g;

    // http://msdn.microsoft.com/en-us/library/windows/desktop/bb205403(v=vs.85).aspx
    // http://msdn.microsoft.com/en-us/library/windows/desktop/microsoft.directx_sdk.quaternion.xmquaternionbarycentric(v=vs.85).aspx
    const s = f + g;
    if (s === 0) {
      quat.copy(this.rotation, t1.rotation);
    } else {
      quat.slerp(q1, t1.rotation, t2.rotation, s);
      quat.slerp(q2, t1.rotation, t3.rotation, s);
      quat.slerp(this.rotation, q1, q2, g / s);
    }
  }
  /**
   * Additive blending between two clips
   */
  additiveBlend(t1: SamplerTrack, t2: SamplerTrack) {
    vec3.add(this.position, t1.position, t2.position);
    vec3.add(this.scale, t1.scale, t2.scale);
    quat.multiply(this.rotation, t2.rotation, t1.rotation);
  }
  /**
   * Subtractive blending between two clips
   */
  subtractiveBlend(t1: SamplerTrack, t2: SamplerTrack) {
    vec3.sub(this.position, t1.position, t2.position);
    vec3.sub(this.scale, t1.scale, t2.scale);
    quat.invert(this.rotation, t2.rotation);
    quat.multiply(this.rotation, this.rotation, t1.rotation);
  }

  /**
   * Clone a new SamplerTrack
   * @return {clay.animation.SamplerTrack}
   */
  clone() {
    const track = new SamplerTrack();
    track.channels = {
      time: this.channels.time,
      position: this.channels.position,
      rotation: this.channels.rotation,
      scale: this.channels.scale
    };
    vec3.copy(track.position, this.position);
    quat.copy(track.rotation, this.rotation);
    vec3.copy(track.scale, this.scale);

    track.target = this.target;
    track.updateTarget();

    return track;
  }
}

export default SamplerTrack;
