/**
 * @license
 * Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *   * Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *   * Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

import { GLMAT_RANDOM, Vec3Array, Mat4Array, Mat3Array, QuatArray } from './common';
export type { Vec3Array };
/**
 * Creates a new, empty vec3
 *
 * @returns a new 3D vector
 */
export function create(): Vec3Array {
  return [0, 0, 0];
}

/**
 * Creates a new vec3 initialized with values from an existing vector
 *
 * @param a vector to clone
 * @returns a new 3D vector
 */
export function clone(a: number[]): Vec3Array {
  return [a[0], a[1], a[2]];
}

/**
 * Creates a new vec3 initialized with the given values
 *
 * @param x X component
 * @param y Y component
 * @param z Z component
 * @returns a new 3D vector
 */
export function fromValues(x: number, y: number, z: number): Vec3Array {
  return [x, y, z];
}

/**
 * Copy the values from one vec3 to another
 *
 * @param out the receiving vector
 * @param a the source vector
 * @returns out
 */
export function copy(out: Vec3Array, a: Vec3Array) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}

/**
 * Set the components of a vec3 to the given values
 *
 * @param out the receiving vector
 * @param x X component
 * @param y Y component
 * @param z Z component
 * @returns out
 */
export function set(out: Vec3Array, x: number, y: number, z: number) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

/**
 * Adds two vec3's
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @returns out
 */
export function add(out: Vec3Array, a: Vec3Array, b: Vec3Array) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}

/**
 * Subtracts vector b from vector a
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @returns out
 */
export function subtract(out: Vec3Array, a: Vec3Array, b: Vec3Array) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}

/**
 * Alias for {@link vec3.subtract}
 * @function
 */
export const sub = subtract;

/**
 * Multiplies two vec3's
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @returns out
 */
export function multiply(out: Vec3Array, a: Vec3Array, b: Vec3Array) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  return out;
}

/**
 * Alias for {@link vec3.multiply}
 * @function
 */
export const mul = multiply;

/**
 * Divides two vec3's
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @returns out
 */
export function divide(out: Vec3Array, a: Vec3Array, b: Vec3Array) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  out[2] = a[2] / b[2];
  return out;
}

/**
 * Alias for {@link vec3.divide}
 * @function
 */
export const div = divide;

/**
 * Returns the minimum of two vec3's
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @returns out
 */
export function min(out: Vec3Array, a: Vec3Array, b: Vec3Array) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  out[2] = Math.min(a[2], b[2]);
  return out;
}

/**
 * Returns the maximum of two vec3's
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @returns out
 */
export function max(out: Vec3Array, a: Vec3Array, b: Vec3Array) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  out[2] = Math.max(a[2], b[2]);
  return out;
}

/**
 * Scales a vec3 by a scalar number
 *
 * @param out the receiving vector
 * @param a the vector to scale
 * @param b amount to scale the vector by
 * @returns out
 */
export function scale(out: Vec3Array, a: Vec3Array, b: number) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  return out;
}

/**
 * Adds two vec3's after scaling the second operand by a scalar value
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @param scale the amount to scale b by before adding
 * @returns out
 */
export function scaleAndAdd(out: Vec3Array, a: Vec3Array, b: Vec3Array, scale: number) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  return out;
}

/**
 * Calculates the euclidian distance between two vec3's
 *
 * @param a the first operand
 * @param b the second operand
 * @returns distance between a and b
 */
export function distance(a: Vec3Array, b: Vec3Array) {
  const x = b[0] - a[0],
    y = b[1] - a[1],
    z = b[2] - a[2];
  return Math.sqrt(x * x + y * y + z * z);
}

/**
 * Alias for {@link vec3.distance}
 * @function
 */
export const dist = distance;

/**
 * Calculates the squared euclidian distance between two vec3's
 *
 * @param a the first operand
 * @param b the second operand
 * @returns squared distance between a and b
 */
export function squaredDistance(a: Vec3Array, b: Vec3Array) {
  const x = b[0] - a[0],
    y = b[1] - a[1],
    z = b[2] - a[2];
  return x * x + y * y + z * z;
}

/**
 * Alias for {@link vec3.squaredDistance}
 * @function
 */
export const sqrDist = squaredDistance;

/**
 * Calculates the length of a vec3
 *
 * @param a vector to calculate length of
 * @returns length of a
 */
// eslint-disable-next-line
export function length(a: Vec3Array) {
  const x = a[0],
    y = a[1],
    z = a[2];
  return Math.sqrt(x * x + y * y + z * z);
}

/**
 * Alias for {@link vec3.length}
 * @function
 */
export const len = length;

/**
 * Calculates the squared length of a vec3
 *
 * @param a vector to calculate squared length of
 * @returns squared length of a
 */
export function squaredLength(a: Vec3Array) {
  const x = a[0],
    y = a[1],
    z = a[2];
  return x * x + y * y + z * z;
}

/**
 * Alias for {@link vec3.squaredLength}
 * @function
 */
export const sqrLen = squaredLength;

/**
 * Negates the components of a vec3
 *
 * @param out the receiving vector
 * @param a vector to negate
 * @returns out
 */
export function negate(out: Vec3Array, a: Vec3Array) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  return out;
}

/**
 * Returns the inverse of the components of a vec3
 *
 * @param out the receiving vector
 * @param a vector to invert
 * @returns out
 */
export function inverse(out: Vec3Array, a: Vec3Array) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  out[2] = 1.0 / a[2];
  return out;
}

/**
 * Normalize a vec3
 *
 * @param out the receiving vector
 * @param a vector to normalize
 * @returns out
 */
export function normalize(out: Vec3Array, a: Vec3Array) {
  const x = a[0],
    y = a[1],
    z = a[2];
  let len = x * x + y * y + z * z;
  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
    out[0] = a[0] * len;
    out[1] = a[1] * len;
    out[2] = a[2] * len;
  }
  return out;
}

/**
 * Calculates the dot product of two vec3's
 *
 * @param a the first operand
 * @param b the second operand
 * @returns dot product of a and b
 */
export function dot(a: Vec3Array, b: Vec3Array) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Computes the cross product of two vec3's
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @returns out
 */
export function cross(out: Vec3Array, a: Vec3Array, b: Vec3Array) {
  const ax = a[0],
    ay = a[1],
    az = a[2],
    bx = b[0],
    by = b[1],
    bz = b[2];

  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}

/**
 * Performs a linear interpolation between two vec3's
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @param t interpolation amount between the two inputs
 * @returns out
 */
export function lerp(out: Vec3Array, a: Vec3Array, b: Vec3Array, t: number) {
  const ax = a[0],
    ay = a[1],
    az = a[2];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  out[2] = az + t * (b[2] - az);
  return out;
}

/**
 * Generates a random vector with the given scale
 *
 * @param out the receiving vector
 * @param [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns out
 */
export function random(out: Vec3Array, scale: number) {
  scale = scale || 1.0;

  const r = GLMAT_RANDOM() * 2.0 * Math.PI;
  const z = GLMAT_RANDOM() * 2.0 - 1.0;
  const zScale = Math.sqrt(1.0 - z * z) * scale;

  out[0] = Math.cos(r) * zScale;
  out[1] = Math.sin(r) * zScale;
  out[2] = z * scale;
  return out;
}

/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param out the receiving vector
 * @param a the vector to transform
 * @param m matrix to transform with
 * @returns out
 */
export function transformMat4(out: Vec3Array, a: Vec3Array, m: Mat4Array) {
  const x = a[0],
    y = a[1],
    z = a[2];
  let w = m[3] * x + m[7] * y + m[11] * z + m[15];
  w = w || 1.0;
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return out;
}

/**
 * Transforms the vec3 with a mat3.
 *
 * @param out the receiving vector
 * @param a the vector to transform
 * @param m the 3x3 matrix to transform with
 * @returns out
 */
export function transformMat3(out: Vec3Array, a: Vec3Array, m: Mat3Array) {
  const x = a[0],
    y = a[1],
    z = a[2];
  out[0] = x * m[0] + y * m[3] + z * m[6];
  out[1] = x * m[1] + y * m[4] + z * m[7];
  out[2] = x * m[2] + y * m[5] + z * m[8];
  return out;
}

/**
 * Transforms the vec3 with a quat
 *
 * @param out the receiving vector
 * @param a the vector to transform
 * @param q quaternion to transform with
 * @returns out
 */
export function transformQuat(out: Vec3Array, a: Vec3Array, q: QuatArray) {
  // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations

  const x = a[0],
    y = a[1],
    z = a[2],
    qx = q[0],
    qy = q[1],
    qz = q[2],
    qw = q[3],
    // calculate quat * vec
    ix = qw * x + qy * z - qz * y,
    iy = qw * y + qz * x - qx * z,
    iz = qw * z + qx * y - qy * x,
    iw = -qx * x - qy * y - qz * z;

  // calculate result * inverse quat
  out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
  out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
  out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
  return out;
}

/**
 * Rotate a 3D vector around the x-axis
 * @param out The receiving vec3
 * @param a The vec3 point to rotate
 * @param b The origin of the rotation
 * @param c The angle of rotation
 * @returns out
 */
export function rotateX(out: Vec3Array, a: Vec3Array, b: Vec3Array, c: number) {
  const p = [],
    r = [];
  //Translate point to the origin
  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2];

  //perform rotation
  r[0] = p[0];
  r[1] = p[1] * Math.cos(c) - p[2] * Math.sin(c);
  r[2] = p[1] * Math.sin(c) + p[2] * Math.cos(c);

  //translate to correct position
  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];

  return out;
}

/**
 * Rotate a 3D vector around the y-axis
 * @param out The receiving vec3
 * @param a The vec3 point to rotate
 * @param b The origin of the rotation
 * @param c The angle of rotation
 * @returns out
 */
export function rotateY(out: Vec3Array, a: Vec3Array, b: Vec3Array, c: number) {
  const p = [],
    r = [];
  //Translate point to the origin
  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2];

  //perform rotation
  r[0] = p[2] * Math.sin(c) + p[0] * Math.cos(c);
  r[1] = p[1];
  r[2] = p[2] * Math.cos(c) - p[0] * Math.sin(c);

  //translate to correct position
  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];

  return out;
}

/**
 * Rotate a 3D vector around the z-axis
 * @param out The receiving vec3
 * @param a The vec3 point to rotate
 * @param b The origin of the rotation
 * @param c The angle of rotation
 * @returns out
 */
export function rotateZ(out: Vec3Array, a: Vec3Array, b: Vec3Array, c: number) {
  const p = [],
    r = [];
  //Translate point to the origin
  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2];

  //perform rotation
  r[0] = p[0] * Math.cos(c) - p[1] * Math.sin(c);
  r[1] = p[0] * Math.sin(c) + p[1] * Math.cos(c);
  r[2] = p[2];

  //translate to correct position
  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];

  return out;
}

/**
 * Perform some operation over an array of vec3s.
 *
 * @param a the array of vectors to iterate over
 * @param stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param offset Number of elements to skip at the beginning of the array
 * @param count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param fn Function to call for each vector in the array
 * @param arg additional argument to pass to fn
 * @returns a
 * @function
 */
export const forEach = (function () {
  const vec = create();
  return function <T>(
    a: { readonly length: number; [n: number]: number },
    stride: number | undefined,
    offset: number | undefined,
    count: number | undefined,
    fn: undefined extends T
      ? (a: Vec3Array, b: Vec3Array) => void
      : (a: Vec3Array, b: Vec3Array, arg: T) => void,
    arg?: T
  ) {
    let i, l;
    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
})();

/**
 * Get the angle between two 3D vectors
 * @param a The first operand
 * @param b The second operand
 * @returns The angle in radians
 */
export function angle(a: Vec3Array, b: Vec3Array) {
  const tempA = fromValues(a[0], a[1], a[2]);
  const tempB = fromValues(b[0], b[1], b[2]);

  normalize(tempA, tempA);
  normalize(tempB, tempB);

  const cosine = dot(tempA, tempB);

  if (cosine > 1.0) {
    return 0;
  } else {
    return Math.acos(cosine);
  }
}
